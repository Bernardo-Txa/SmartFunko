#!/usr/bin/env node
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import process from "node:process";

const requireFromWeb = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const DEFAULT_FILE = "relatorios/produtos-precos-supabase.csv";
const DEFAULT_BATCH_SIZE = 100;

function parseArgs(argv) {
  const args = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: false,
    file: DEFAULT_FILE,
    skipInvalid: false,
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

function loadInputText(path) {
  const extension = extname(path).toLowerCase();

  if (extension !== ".xlsx") {
    return {
      text: readFileSync(path, "utf8"),
      cleanup: () => {},
    };
  }

  const tempDir = mkdtempSync(join(tmpdir(), "smartfunkos-prices-"));

  try {
    execFileSync("libreoffice", ["--headless", "--convert-to", "csv", "--outdir", tempDir, path], {
      stdio: "pipe",
    });

    const csvPath = join(tempDir, `${basename(path, extension)}.csv`);
    return {
      text: readFileSync(csvPath, "utf8"),
      cleanup: () => rmSync(tempDir, { force: true, recursive: true }),
    };
  } catch (error) {
    rmSync(tempDir, { force: true, recursive: true });
    throw new Error(
      `Nao foi possivel converter XLSX para CSV. Verifique se o LibreOffice esta instalado. Detalhe: ${error.message}`,
    );
  }
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
}

function firstRecordLine(text) {
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      return text.slice(0, index);
    }
  }

  return text;
}

function detectDelimiter(text) {
  const headerLine = firstRecordLine(text).replace(/^\uFEFF/, "");
  return countDelimiter(headerLine, ";") > countDelimiter(headerLine, ",") ? ";" : ",";
}

function parseCsv(text, delimiter) {
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

    if (char === delimiter && !inQuotes) {
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

function parsePrice(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");

  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");
  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Math.round(number * 100) / 100;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }

  return `R$ ${number.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function headerMap(headers) {
  return new Map(headers.map((header, index) => [header.trim().replace(/^\uFEFF/, ""), index]));
}

function firstHeaderIndex(indexByHeader, names) {
  for (const name of names) {
    if (indexByHeader.has(name)) {
      return indexByHeader.get(name);
    }
  }

  return null;
}

function mapRows(rows) {
  const [headers, ...dataRows] = rows;
  const indexByHeader = headerMap(headers ?? []);
  const variantIdIndex = firstHeaderIndex(indexByHeader, ["variant_id", "id_variante"]);
  const skuIndex = firstHeaderIndex(indexByHeader, ["Codigo", "codigo", "sku"]);
  const nameIndex = firstHeaderIndex(indexByHeader, ["nome", "name"]);
  const priceIndex = firstHeaderIndex(indexByHeader, ["preco", "preço", "sale_price"]);

  if (priceIndex === null) {
    throw new Error("CSV sem coluna de preco: use preco, preço ou sale_price.");
  }

  if (variantIdIndex === null && skuIndex === null) {
    throw new Error("CSV sem identificador: use variant_id ou Codigo.");
  }

  const valid = [];
  const invalid = [];
  const seen = new Set();

  dataRows.forEach((row, rowIndex) => {
    const line = rowIndex + 2;
    const variantId = variantIdIndex !== null ? row[variantIdIndex]?.trim() : "";
    const sku = skuIndex !== null ? row[skuIndex]?.trim() : "";
    const name = nameIndex !== null ? row[nameIndex]?.trim() : "";
    const price = parsePrice(row[priceIndex] ?? "");

    if (!row.some((entry) => entry.trim() !== "")) {
      return;
    }

    const key = variantId ? `id:${variantId}` : `sku:${sku}`;
    const missing = [
      !variantId && !sku ? "variant_id/Codigo" : null,
      price === null ? "preco" : null,
      seen.has(key) ? "linha duplicada" : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      invalid.push({
        line,
        name,
        reason: `${missing.join(", ")} ausente/invalido`,
        sku,
        variantId,
      });
      return;
    }

    seen.add(key);
    valid.push({
      line,
      name,
      price,
      sku,
      variantId,
    });
  });

  return { invalid, valid };
}

async function fetchVariantsByField(supabase, field, values, batchSize) {
  const byId = new Map();
  const bySku = new Map();
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));

  for (const chunk of chunks(uniqueValues, batchSize)) {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "id,product_id,sku,condition,type,source,sale_price,market_price,estimated_cost,status,special_label,special_tags",
      )
      .in(field, chunk);

    if (error) {
      throw new Error(`product_variants: ${error.message}`);
    }

    for (const variant of data ?? []) {
      byId.set(variant.id, variant);
      bySku.set(variant.sku, variant);
    }
  }

  return { byId, bySku };
}

async function fetchCurrentVariants(supabase, rows, batchSize) {
  const byId = new Map();
  const bySku = new Map();
  const ids = rows.map((row) => row.variantId).filter(Boolean);
  const skus = rows.filter((row) => !row.variantId).map((row) => row.sku).filter(Boolean);

  const idResult = await fetchVariantsByField(supabase, "id", ids, batchSize);
  const skuResult = await fetchVariantsByField(supabase, "sku", skus, batchSize);

  for (const [key, value] of [...idResult.byId, ...skuResult.byId]) {
    byId.set(key, value);
  }

  for (const [key, value] of [...idResult.bySku, ...skuResult.bySku]) {
    bySku.set(key, value);
  }

  return { byId, bySku };
}

function cents(value) {
  return Math.round(Number(value) * 100);
}

function buildUpdates(rows, currentVariants) {
  const updates = [];
  const missing = [];

  for (const row of rows) {
    const current = row.variantId
      ? currentVariants.byId.get(row.variantId)
      : currentVariants.bySku.get(row.sku);

    if (!current) {
      missing.push({
        line: row.line,
        name: row.name,
        reason: "variante nao encontrada",
        sku: row.sku,
        variantId: row.variantId,
      });
      continue;
    }

    if (cents(current.sale_price) === cents(row.price)) {
      continue;
    }

    updates.push({
      currentPrice: Number(current.sale_price),
      nextPrice: row.price,
      row,
      update: {
        condition: current.condition,
        estimated_cost: current.estimated_cost,
        id: current.id,
        market_price: current.market_price,
        product_id: current.product_id,
        sale_price: row.price,
        sku: current.sku,
        source: current.source,
        special_label: current.special_label,
        special_tags: current.special_tags ?? [],
        status: current.status,
        type: current.type,
      },
    });
  }

  return { missing, updates };
}

async function upsertUpdates(supabase, updates, batchSize) {
  for (const chunk of chunks(updates, batchSize)) {
    const { error } = await supabase
      .from("product_variants")
      .upsert(chunk.map((entry) => entry.update), { onConflict: "id" });

    if (error) {
      throw new Error(`product_variants: ${error.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(resolve("web/.env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em web/.env.local");
  }

  const csvPath = resolve(args.file);
  const input = loadInputText(csvPath);
  let invalid;
  let valid;

  try {
    const delimiter = detectDelimiter(input.text);
    const parsed = parseCsv(input.text, delimiter);
    ({ invalid, valid } = mapRows(parsed));
  } finally {
    input.cleanup();
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const currentVariants = await fetchCurrentVariants(supabase, valid, args.batchSize);
  const { missing, updates } = buildUpdates(valid, currentVariants);
  const allInvalid = [...invalid, ...missing];

  console.log(`CSV: ${csvPath}`);
  console.log(`Linhas validas: ${valid.length}`);
  console.log(`Linhas invalidas: ${allInvalid.length}`);
  console.log(`Alteracoes de preco: ${updates.length}`);

  if (allInvalid.length > 0) {
    console.log("Primeiras linhas invalidas:");
    for (const entry of allInvalid.slice(0, 10)) {
      console.log(
        `- linha ${entry.line}: ${entry.variantId || entry.sku || "-"} ${entry.name || "-"} (${entry.reason})`,
      );
    }
  }

  if (updates.length > 0) {
    console.log("Primeiras alteracoes:");
    for (const entry of updates.slice(0, 10)) {
      console.log(
        `- ${entry.update.sku}: ${formatMoney(entry.currentPrice)} -> ${formatMoney(entry.nextPrice)}`,
      );
    }
  }

  if (allInvalid.length > 0 && !args.skipInvalid) {
    throw new Error("Corrija as linhas invalidas ou use --skip-invalid.");
  }

  if (args.dryRun) {
    console.log("Dry run: nenhuma escrita executada.");
    return;
  }

  await upsertUpdates(supabase, updates, args.batchSize);
  console.log("Importacao de precos concluida.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
