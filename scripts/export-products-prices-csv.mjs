#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const requireFromWeb = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const DEFAULT_FILE = "relatorios/produtos-precos-supabase.csv";
const DEFAULT_BATCH_SIZE = 1000;

const HEADERS = [
  "variant_id",
  "product_id",
  "Codigo",
  "nome",
  "preco",
  "imagem",
  "status",
  "variant_status",
  "source",
  "categoria_principal",
  "subcategoria",
  "franquia",
  "fornecedor",
  "special",
  "special_tags",
  "tipo",
  "condicao",
  "market_price",
  "estimated_cost",
  "slug",
];

function parseArgs(argv) {
  const args = {
    batchSize: DEFAULT_BATCH_SIZE,
    file: DEFAULT_FILE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      args.file = argv[index + 1];
      index += 1;
    } else if (arg === "--batch-size") {
      args.batchSize = Number(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize <= 0) {
    throw new Error("--batch-size precisa ser um inteiro positivo.");
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

function firstRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sortImages(images) {
  return [...(images ?? [])].sort((left, right) => {
    const leftOrder = Number.isFinite(left?.sort_order) ? left.sort_order : 0;
    const rightOrder = Number.isFinite(right?.sort_order) ? right.sort_order : 0;
    return leftOrder - rightOrder;
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "";
  }

  return number.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(values) {
  return values.map(csvValue).join(",");
}

async function fetchAllVariants(supabase, batchSize) {
  const select = `
    id,
    product_id,
    sku,
    condition,
    type,
    source,
    sale_price,
    market_price,
    estimated_cost,
    status,
    special_label,
    special_tags,
    products!inner(
      id,
      name,
      slug,
      status,
      category_name,
      subcategory_name,
      external_catalog_code,
      main_image_url,
      franchises(name),
      suppliers(name),
      product_images(image_url,sort_order)
    )
  `;

  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("product_variants")
      .select(select)
      .order("sku", { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(`product_variants: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return rows;
}

function mapVariant(variant) {
  const product = firstRelation(variant.products);
  const franchise = firstRelation(product?.franchises);
  const supplier = firstRelation(product?.suppliers);
  const image = product?.main_image_url || sortImages(product?.product_images)[0]?.image_url || "";
  const specialTags = Array.isArray(variant.special_tags)
    ? variant.special_tags.filter(Boolean)
    : [];

  return {
    Codigo: variant.sku ?? product?.external_catalog_code ?? "",
    categoria_principal: product?.category_name ?? franchise?.name ?? "",
    condicao: variant.condition ?? "",
    estimated_cost: formatMoney(variant.estimated_cost),
    fornecedor: supplier?.name ?? "",
    franquia: franchise?.name ?? "",
    imagem: image,
    market_price: formatMoney(variant.market_price),
    nome: product?.name ?? "",
    preco: formatMoney(variant.sale_price),
    product_id: product?.id ?? variant.product_id ?? "",
    slug: product?.slug ?? "",
    source: variant.source ?? "",
    special: variant.special_label ?? "",
    special_tags: specialTags.join("|"),
    status: product?.status ?? "",
    tipo: variant.type ?? "",
    variant_id: variant.id ?? "",
    variant_status: variant.status ?? "",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
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

  const variants = await fetchAllVariants(supabase, args.batchSize);
  const rows = variants.map(mapVariant);
  const csv = [
    csvLine(HEADERS),
    ...rows.map((row) => csvLine(HEADERS.map((header) => row[header]))),
  ].join("\n");

  const csvPath = resolve(args.file);
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, `\uFEFF${csv}\n`, "utf8");

  console.log(`Arquivo exportado: ${csvPath}`);
  console.log(`Linhas exportadas: ${rows.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
