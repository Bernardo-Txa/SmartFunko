#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = resolve(repositoryRoot, "supabase/migrations");

const migrations = {
  "20261112220637": ["preorder_rls_hardening", "ed820228ae404f2b56b2a09c0306e94875ee5ba41c4ec63ad871befc11a9ad07"],
  "20261112220803": ["catalog_views_security_invoker", "9b9f62f548db35a40a12a1ccf6a4e4c3a8d7249fb7106be712ecb1e3d3d94439"],
  "20261112220943": ["security_definer_function_privileges", "16beeb6c9418519a72b01cc8400e767db43c6c4a7652a4dc7d89d076d1546c99"],
  "20261112235807": ["preorder_rls_customer_lookup_grant", "aade55536ac14b78f409074ce852bb1eef4b87b258362e4c706a59e5bb4b55c7"],
  "20261113000103": ["catalog_views_public_base_column_grants", "7da14898278fafe671a9e92c29c12c1ff577a27a6f4d6190c0b35add5240b495"],
  "20261113000158": ["catalog_category_options_exclude_rare_collectibles", "87c7de07dd874e194f4eca24c4c44bfb3124b780b1411e84de7e930c94318f4c"],
  "20261113000439": ["v2_backend_explicit_table_grants", "491ea04b9c2d8ec3a747d15f1d4c91d75765a86c23718a4b8483b4ba594ad96e"],
  "20261113005521": ["mobile_v2_persistent_idempotency", "e826b59656928d81559cd6aa68962ffce74a8b7f9fbe425f562324959f98b8a3"],
  "20261113012619": ["fix_mobile_v2_payment_competence_uuid_aggregate", "99aeff3f32e4b80f3148889d70960a3de7d3c93d26a66fec220e3dd484f7d1f6"],
  "20261113021342": ["catalog_base_table_least_privilege", "8c67045418a0ff1f30d40f910d19d4e167336c948861036d1f7b14f8fdf58b1d"],
};

const groups = {
  A: ["20261112220637", "20261112235807"],
  B: ["20261112220803", "20261113000103", "20261113000158"],
  C: ["20261112220943", "20261113000439"],
  D: ["20261113005521", "20261113012619"],
  E: ["20261113021342"],
};

const group = process.argv[2]?.toUpperCase();
const failureArgument = process.argv.find((argument) => argument.startsWith("--inject-failure-after="));
const injectFailureAfter = failureArgument ? Number(failureArgument.split("=")[1]) : 0;

if (!groups[group] || !Number.isInteger(injectFailureAfter) || injectFailureAfter < 0) {
  console.error("Usage: node scripts/build-mobile-release-rollout.mjs <A|B|C|D|E> [--inject-failure-after=N]");
  process.exit(2);
}

const sql = [
  "begin;",
  "set local lock_timeout = '5s';",
  "set local statement_timeout = '60s';",
  "set local idle_in_transaction_session_timeout = '60s';",
];

for (const [index, version] of groups[group].entries()) {
  const [name, expectedChecksum] = migrations[version];
  const path = resolve(migrationDirectory, `${version}_${name}.sql`);
  const contents = readFileSync(path, "utf8");
  const checksum = createHash("sha256").update(contents).digest("hex");

  if (checksum !== expectedChecksum) {
    throw new Error(`Checksum mismatch for ${basename(path)}: expected ${expectedChecksum}, got ${checksum}`);
  }
  if (/^\s*(begin|commit|rollback)\s*;/im.test(contents)) {
    throw new Error(`Nested transaction control is not allowed in ${basename(path)}`);
  }
  if (contents.includes("$mobile_release_history$")) {
    throw new Error(`Reserved dollar-quote tag found in ${basename(path)}`);
  }

  sql.push(
    `\n-- ${basename(path)} (sha256 ${checksum})`,
    contents.trimEnd(),
    `\ninsert into supabase_migrations.schema_migrations (version, statements, name)` +
      `\nvalues ('${version}', array[$mobile_release_history$${contents}$mobile_release_history$], '${name}');`,
  );

  if (injectFailureAfter === index + 1) {
    sql.push("\n-- Test-only fault injection; never use for production rollout.\nselect 1 / 0;");
  }
}

sql.push("\ncommit;", "");
process.stdout.write(sql.join("\n"));
