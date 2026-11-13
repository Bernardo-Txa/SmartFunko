import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalog least-privilege migration preserves public Next.js fields", async () => {
  const [catalog, migration] = await Promise.all([
    readFile(new URL("../src/lib/catalog.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../supabase/migrations/20261113021342_catalog_base_table_least_privilege.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(catalog, /const catalogDetailSelect =/);
  for (const column of [
    "external_catalog_code",
    "description",
    "main_image_url",
    "special_label",
    "special_tags",
    "market_price",
  ]) {
    assert.match(catalog, new RegExp(`\\b${column}\\b`));
    assert.match(migration, new RegExp(`\\b${column}\\b`));
  }

  for (const supplierColumn of [
    "description",
    "logo_url",
    "banner_url",
    "accent_color",
    "website_url",
    "sort_order",
  ]) {
    assert.match(catalog, new RegExp(`\\b${supplierColumn}\\b`));
    assert.match(migration, new RegExp(`\\b${supplierColumn}\\b`));
  }
});

test("sensitive fields and client DML remain excluded", async () => {
  const migration = await readFile(
    new URL("../../supabase/migrations/20261113021342_catalog_base_table_least_privilege.sql", import.meta.url),
    "utf8",
  );
  const statements = migration
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  assert.match(statements, /revoke all privileges on table/);
  assert.match(statements, /from anon, authenticated/);
  assert.doesNotMatch(statements, /grant\s+(?:select,\s*)?insert/i);
  assert.doesNotMatch(statements, /grant[^;]*estimated_cost/i);
  assert.doesNotMatch(statements, /grant[^;]*rare_collectibles[^;]*to anon/i);
});

test("admin catalog services continue to use service_role clients", async () => {
  const serviceFiles = [
    "../src/server/products/product-service.ts",
    "../src/server/suppliers/supplier-service.ts",
    "../src/server/rare-collectibles/rare-collectible-service.ts",
  ];

  for (const file of serviceFiles) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /createSupabaseAdminClient/);
    assert.match(source, /SupabaseAdminClient/);
  }
});
