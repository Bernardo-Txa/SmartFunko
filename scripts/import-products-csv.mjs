#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const requireFromWeb = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const DEFAULT_FILE = "Smartfunkos(Produtos).csv";
const VALID_SOURCES = new Set(["own_stock", "national", "international", "preorder"]);
const VALID_VARIANT_STATUSES = new Set(["available", "order_only", "preorder", "sold_out", "hidden"]);

function parseArgs(argv) {
  const args = {
    batchSize: 500,
    dryRun: false,
    file: DEFAULT_FILE,
    limit: null,
    skipInvalid: false,
    source: "national",
    variantStatus: "order_only",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--skip-invalid") {
      args.skipInvalid = true;
    } else if (arg === "--file") {
      args.file = argv[index + 1];
      index += 1;
    } else if (arg === "--limit") {
      args.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--source") {
      args.source = argv[index + 1];
      index += 1;
    } else if (arg === "--variant-status") {
      args.variantStatus = argv[index + 1];
      index += 1;
    } else if (arg === "--batch-size") {
      args.batchSize = Number(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!VALID_SOURCES.has(args.source)) {
    throw new Error(`--source invalido. Use: ${Array.from(VALID_SOURCES).join(", ")}`);
  }

  if (!VALID_VARIANT_STATUSES.has(args.variantStatus)) {
    throw new Error(
      `--variant-status invalido. Use: ${Array.from(VALID_VARIANT_STATUSES).join(", ")}`,
    );
  }

  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const rawValue = trimmed.slice(separator + 1);
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((entry) => entry !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value) {
  const normalized = value.trim().replace(/^R\$\s*/i, "").trim();
  const isValid = /^(\d{1,3}(\.\d{3})*|\d+),\d{2}$/.test(normalized);

  if (!isValid) {
    return null;
  }

  return Number(normalized.replace(/\./g, "").replace(",", "."));
}

function normalizeSubcategory(value) {
  const normalized = value.trim();
  if (!normalized || normalized === "#NAME?") {
    return null;
  }

  return normalized;
}

function specialTags(value) {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function variantTypeFromSpecial(tags) {
  const normalized = tags.map((tag) => slugify(tag));

  if (normalized.includes("chase")) {
    return "chase";
  }

  if (normalized.includes("glow")) {
    return "glow";
  }

  if (normalized.includes("exclusivo")) {
    return "exclusive";
  }

  if (tags.length > 0) {
    return "special";
  }

  return "common";
}

function normalizeSupplierName(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const slug = slugify(trimmed);
  const known = {
    copag: "Copag",
    panini: "Panini",
    piticas: "Piticas",
  };

  return known[slug] ?? trimmed;
}

function mapRows(rows, args) {
  const [headers, ...dataRows] = rows;
  const indexByHeader = Object.fromEntries(headers.map((header, index) => [header.trim(), index]));
  const supplierHeader = ["fornecedor", "marca", "supplier", "collab", "parceiro"].find(
    (header) => header in indexByHeader,
  );
  const requiredHeaders = [
    "nome",
    "preco",
    "imagem",
    "status",
    "categoria_principal",
    "subcategoria",
    "special",
    "Codigo",
  ];

  for (const header of requiredHeaders) {
    if (!(header in indexByHeader)) {
      throw new Error(`CSV sem coluna obrigatoria: ${header}`);
    }
  }

  const valid = [];
  const invalid = [];
  const limitedRows = args.limit ? dataRows.slice(0, args.limit) : dataRows;

  limitedRows.forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const name = row[indexByHeader.nome]?.trim();
    const sku = row[indexByHeader.Codigo]?.trim();
    const price = parsePrice(row[indexByHeader.preco] ?? "");
    const imageUrl = row[indexByHeader.imagem]?.trim();
    const categoryName = row[indexByHeader.categoria_principal]?.trim();
    const subcategoryName = normalizeSubcategory(row[indexByHeader.subcategoria] ?? "");
    const specialLabel = row[indexByHeader.special]?.trim() || null;
    const supplierName = supplierHeader
      ? normalizeSupplierName(row[indexByHeader[supplierHeader]] ?? "")
      : null;
    const tags = specialLabel ? specialTags(specialLabel) : [];

    const missing = [
      !name ? "nome" : null,
      !sku ? "Codigo" : null,
      !price ? "preco" : null,
      !imageUrl ? "imagem" : null,
      !categoryName ? "categoria_principal" : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      invalid.push({
        line,
        name,
        reason: `${missing.join(", ")} ausente/invalido`,
        sku,
      });
      return;
    }

    valid.push({
      categoryName,
      description: `Produto importado do catalogo SmartFunkos. Categoria: ${categoryName}${
        subcategoryName ? `. Linha: ${subcategoryName}` : ""
      }.`,
      franchiseName: subcategoryName ?? categoryName,
      imageUrl,
      name,
      price,
      sku,
      slug: `${slugify(name)}-${slugify(sku)}`,
      source: args.source,
      specialLabel,
      specialTags: tags,
      status: "active",
      subcategoryName,
      supplierName,
      type: variantTypeFromSpecial(tags),
      variantStatus: args.variantStatus,
    });
  });

  return { invalid, valid };
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function upsertChunked(supabase, table, rows, options, batchSize) {
  const returned = [];

  for (const chunk of chunks(rows, batchSize)) {
    const { select, ...upsertOptions } = options;
    const query = supabase.from(table).upsert(chunk, upsertOptions);
    const { data, error } = select ? await query.select(select) : await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    if (data) {
      returned.push(...data);
    }
  }

  return returned;
}

async function runImport(rows, args) {
  loadEnvFile(resolve("web/.env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em web/.env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const franchiseRows = uniqueBy(
    rows.map((row) => ({
      name: row.franchiseName,
      slug: slugify(row.franchiseName),
      status: "active",
    })),
    (row) => row.slug,
  );

  const franchises = await upsertChunked(
    supabase,
    "franchises",
    franchiseRows,
    { onConflict: "slug", select: "id,slug" },
    args.batchSize,
  );
  const franchiseBySlug = new Map(franchises.map((franchise) => [franchise.slug, franchise.id]));

  const supplierRows = uniqueBy(
    rows
      .filter((row) => row.supplierName)
      .map((row) => ({
        name: row.supplierName,
        slug: slugify(row.supplierName),
        status: "active",
      })),
    (row) => row.slug,
  );
  const suppliers = supplierRows.length > 0
    ? await upsertChunked(
        supabase,
        "suppliers",
        supplierRows,
        { onConflict: "slug", select: "id,slug" },
        args.batchSize,
      )
    : [];
  const supplierBySlug = new Map(suppliers.map((supplier) => [supplier.slug, supplier.id]));

  const productRows = rows.map((row) => ({
    category_name: row.categoryName,
    description: row.description,
    external_catalog_code: row.sku,
    franchise_id: franchiseBySlug.get(slugify(row.franchiseName)) ?? null,
    main_image_url: row.imageUrl,
    name: row.name,
    slug: row.slug,
    status: row.status,
    subcategory_name: row.subcategoryName,
    supplier_id: row.supplierName ? supplierBySlug.get(slugify(row.supplierName)) ?? null : null,
  }));

  const products = await upsertChunked(
    supabase,
    "products",
    productRows,
    { onConflict: "slug", select: "id,slug" },
    args.batchSize,
  );
  const productBySlug = new Map(products.map((product) => [product.slug, product.id]));

  const variantRows = rows.map((row) => ({
    condition: "new",
    estimated_cost: null,
    market_price: null,
    product_id: productBySlug.get(row.slug),
    sale_price: row.price,
    sku: row.sku,
    source: row.source,
    special_label: row.specialLabel,
    special_tags: row.specialTags,
    status: row.variantStatus,
    type: row.type,
  }));

  await upsertChunked(
    supabase,
    "product_variants",
    variantRows,
    { onConflict: "sku", select: "id,sku" },
    args.batchSize,
  );

  const imageRows = rows.map((row) => ({
    image_url: row.imageUrl,
    product_id: productBySlug.get(row.slug),
    sort_order: 0,
  }));

  await upsertChunked(
    supabase,
    "product_images",
    imageRows,
    { ignoreDuplicates: false, onConflict: "product_id,image_url" },
    args.batchSize,
  );

	return {
	  franchises: franchiseRows.length,
	  images: imageRows.length,
	  products: productRows.length,
	  suppliers: supplierRows.length,
	  variants: variantRows.length,
	};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = resolve(args.file);
  const csv = readFileSync(csvPath, "utf8");
  const parsed = parseCsv(csv);
  const { invalid, valid } = mapRows(parsed, args);

  console.log(`CSV: ${csvPath}`);
  console.log(`Linhas de produto: ${valid.length + invalid.length}`);
  console.log(`Linhas validas: ${valid.length}`);
  console.log(`Linhas invalidas: ${invalid.length}`);

  if (invalid.length > 0) {
    console.log("Primeiras linhas invalidas:");
    for (const entry of invalid.slice(0, 10)) {
      console.log(`- linha ${entry.line}: ${entry.sku ?? "-"} ${entry.name ?? "-"} (${entry.reason})`);
    }
  }

  if (invalid.length > 0 && !args.skipInvalid) {
    throw new Error("Corrija as linhas invalidas ou use --skip-invalid.");
  }

  if (args.dryRun) {
    console.log("Dry run: nenhuma escrita executada.");
    return;
  }

  const summary = await runImport(valid, args);
  console.log("Importacao concluida:");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
