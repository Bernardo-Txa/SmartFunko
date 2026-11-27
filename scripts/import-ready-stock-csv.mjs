#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { resolve } from "node:path";
import process from "node:process";

const requireFromWeb = createRequire(new URL("../web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

function parseArgs(argv) {
  const args = { addExistingStock: false, dryRun: false, file: "" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--dry-run") args.dryRun = true;
    else if (argv[index] === "--add-existing-stock") args.addExistingStock = true;
    else if (argv[index] === "--file") { args.file = argv[index + 1] ?? ""; index += 1; }
    else throw new Error(`Argumento desconhecido: ${argv[index]}`);
  }
  if (!args.file) throw new Error("Informe o CSV com --file");
  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator);
    if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).replace(/^["']|["']$/g, "");
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { row.push(value); value = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = []; value = ""; continue;
    }
    value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeTitle(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function mapRows(parsed) {
  const [headers, ...dataRows] = parsed;
  const columns = Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, "").trim(), index]));
  const titleColumn = columns["DESCRIÇÃO"] ?? columns["TITULO DESCRICAO"];
  const quantityColumn = columns["QUANT."] ?? columns.QUANTIDADE;
  const priceColumn = columns.VALOR ?? columns.PRECO;
  const imageColumn = columns.IMAGEM;
  if ([titleColumn, quantityColumn, priceColumn, imageColumn].some((column) => column === undefined)) {
    throw new Error("Planilha sem as colunas de titulo, preco, quantidade e imagem");
  }

  const valid = [], invalid = [];
  dataRows.forEach((row, index) => {
    const line = index + 2;
    let title = (row[titleColumn] ?? "").trim().replace(/\s+/g, " ");
    if (!title) return; // ignora a linha de total da planilha
    const quantity = Number(row[quantityColumn]);
    const priceText = String(row[priceColumn] ?? "").trim();
    const price = /^\d+(?:\.\d+)?$/.test(priceText)
      ? Number(priceText)
      : /^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$/.test(priceText)
        ? Number(priceText.replace(/\./g, "").replace(",", ".")) : NaN;
    const mainImageUrl = String(row[imageColumn] ?? "").trim();
    if (normalizeTitle(title) === "pop marvel x men 97 s3 pop") {
      const character = mainImageUrl.match(/x-men-97-([a-z0-9-]+?)-\d+-img/i)?.[1];
      if (character) title = `${title} - ${character.replaceAll("-", " ").toUpperCase()}`;
    }
    const reasons = [];
    if (!Number.isInteger(quantity) || quantity < 0) reasons.push("quantidade invalida");
    if (!Number.isFinite(price) || price <= 0) reasons.push("preco invalido");
    if (mainImageUrl) {
      try { const url = new URL(mainImageUrl); if (!["http:", "https:"].includes(url.protocol)) reasons.push("imagem invalida"); }
      catch { reasons.push("imagem invalida"); }
    }
    if (reasons.length) { invalid.push({ line, reasons, title }); return; }
    const hash = createHash("sha256").update(normalizeTitle(title)).digest("hex");
    valid.push({
      code: `BLACK-${hash.slice(0, 10).toUpperCase()}`,
      main_image_url: mainImageUrl || null,
      price,
      quantity,
      reserved_quantity: 0,
      slug: `${slugify(title).slice(0, 90)}-${hash.slice(0, 8)}`,
      status: "open",
      title,
    });
  });
  return { invalid, valid };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = resolve(args.file);
  let parsed;
  if (extname(csvPath).toLowerCase() === ".xlsx") {
    const result = spawnSync("python3", [resolve("scripts/read-ready-stock-xlsx.py"), csvPath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr || "Falha ao ler planilha XLSX");
    parsed = JSON.parse(result.stdout).rows;
  } else {
    parsed = parseCsv(readFileSync(csvPath, "utf8"));
  }
  const { invalid, valid } = mapRows(parsed);
  if (invalid.length) throw new Error(`CSV possui ${invalid.length} linha(s) invalida(s): ${JSON.stringify(invalid.slice(0, 5))}`);
  const duplicateTitles = valid.filter((item, index) => valid.findIndex((candidate) => normalizeTitle(candidate.title) === normalizeTitle(item.title)) !== index);
  if (duplicateTitles.length) throw new Error(`CSV possui titulos duplicados: ${duplicateTitles.map((item) => item.title).join(", ")}`);

  loadEnvFile(resolve("web/.env.local"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase admin nao configurado em web/.env.local");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existing, error: existingError } = await supabase.from("ready_stock_items").select("id,code,title,quantity");
  if (existingError) throw new Error(`Falha ao conferir duplicidades: ${existingError.message}`);
  const existingByTitle = new Map((existing ?? []).map((item) => [normalizeTitle(item.title), item]));
  const skipped = valid.filter((item) => existingByTitle.has(normalizeTitle(item.title)));
  const pending = valid.filter((item) => !existingByTitle.has(normalizeTitle(item.title)));
  const restocked = args.addExistingStock ? skipped : [];

  console.log(JSON.stringify({ dryRun: args.dryRun, file: csvPath, valid: valid.length, pending: pending.length, restockExisting: restocked.length, skippedExisting: skipped.length - restocked.length, units: pending.concat(restocked).reduce((sum, item) => sum + item.quantity, 0), existingTitles: skipped.map((item) => item.title) }, null, 2));
  if (args.dryRun) return;
  let inserted = [];
  if (pending.length) {
    const { data, error } = await supabase.from("ready_stock_items").insert(pending).select("id,code,title,quantity,price,status");
    if (error) throw new Error(`Falha ao importar pronta entrega: ${error.message}`);
    inserted = data ?? [];
  }
  for (const item of restocked) {
    const current = existingByTitle.get(normalizeTitle(item.title));
    const { error } = await supabase.from("ready_stock_items").update({
      main_image_url: item.main_image_url,
      price: item.price,
      quantity: current.quantity + item.quantity,
      status: "open",
      updated_at: new Date().toISOString(),
    }).eq("id", current.id).eq("quantity", current.quantity);
    if (error) throw new Error(`Falha ao adicionar estoque de ${item.title}: ${error.message}`);
  }
  console.log(JSON.stringify({ inserted: inserted.length, insertedUnits: inserted.reduce((sum, item) => sum + item.quantity, 0), restocked: restocked.length, restockedUnits: restocked.reduce((sum, item) => sum + item.quantity, 0) }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exit(1); });
