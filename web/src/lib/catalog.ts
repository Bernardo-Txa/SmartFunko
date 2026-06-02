import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { env, hasSupabasePublicEnv } from "@/lib/env";
import {
  franchises as fallbackFranchises,
  getProductBySlug,
  products as fallbackProducts,
  type Product,
} from "@/lib/mock-data";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  funko_number: string | null;
  description: string | null;
  status: string;
  franchises: { name: string } | { name: string }[] | null;
  product_variants: Array<{
    sku: string;
    condition: "new" | "used" | "damaged_box";
    type: "common" | "exclusive" | "chase" | "glow" | "special";
    source: "own_stock" | "national" | "international" | "preorder";
    sale_price: number;
    market_price: number | null;
    status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
  }>;
};

const toneByIndex: Product["tone"][] = ["teal", "pink", "amber", "indigo"];

const conditionLabel: Record<ProductRow["product_variants"][number]["condition"], Product["condition"]> = {
  damaged_box: "Caixa avariada",
  new: "Novo",
  used: "Usado",
};

const typeLabel: Record<ProductRow["product_variants"][number]["type"], Product["type"]> = {
  chase: "Chase",
  common: "Comum",
  exclusive: "Exclusivo",
  glow: "Glow",
  special: "Especial",
};

const sourceLabel: Record<ProductRow["product_variants"][number]["source"], Product["source"]> = {
  international: "Importado",
  national: "Encomenda nacional",
  own_stock: "Pronta-entrega",
  preorder: "Pre-venda",
};

function getPublicSupabase() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

function getFranchiseName(franchises: ProductRow["franchises"]) {
  if (Array.isArray(franchises)) {
    return franchises[0]?.name;
  }

  return franchises?.name;
}

function mapProduct(row: ProductRow, index: number): Product {
  const variant = row.product_variants[0];

  return {
    condition: conditionLabel[variant?.condition ?? "new"],
    description: row.description ?? "Produto Smart Funkos com atendimento pelo WhatsApp.",
    franchise: getFranchiseName(row.franchises) ?? "Smart Funkos",
    funkoNumber: row.funko_number ?? "000",
    id: row.id,
    marketPrice: variant?.market_price ?? undefined,
    name: row.name,
    price: Number(variant?.sale_price ?? 0),
    sku: variant?.sku ?? "SF-0000",
    slug: row.slug,
    source: sourceLabel[variant?.source ?? "own_stock"],
    status: variant?.status === "hidden" ? "sold_out" : (variant?.status ?? "sold_out"),
    tone: toneByIndex[index % toneByIndex.length],
    type: typeLabel[variant?.type ?? "common"],
  };
}

export async function getCatalogProducts() {
  noStore();

  if (!hasSupabasePublicEnv()) {
    return fallbackProducts;
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,funko_number,description,status,franchises(name),product_variants(sku,condition,type,source,sale_price,market_price,status)",
    )
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load catalog products", error);
    return fallbackProducts;
  }

  return (data as unknown as ProductRow[])
    .filter((row) => row.product_variants.length > 0)
    .map(mapProduct);
}

export async function getCatalogProductBySlug(slug: string) {
  if (!hasSupabasePublicEnv()) {
    return getProductBySlug(slug);
  }

  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug);
}

export async function getCatalogFranchises() {
  noStore();

  if (!hasSupabasePublicEnv()) {
    return fallbackFranchises;
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("franchises")
    .select("id,name,slug")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load catalog franchises", error);
    return fallbackFranchises;
  }

  return data;
}
