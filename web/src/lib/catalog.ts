import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { env, hasSupabasePublicEnv, isDevelopmentMockAllowed } from "@/lib/env";
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
  franchises: { name: string; slug: string } | { name: string; slug: string }[] | null;
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

export type CatalogProductFilters = {
  franchise?: string;
  page?: number;
  pageSize?: number;
  query?: string;
  status?: Product["status"] | "all";
};

export type CatalogProductPage = {
  data: Product[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

function fallbackOrThrow<T>(data: T, context: string) {
  if (isDevelopmentMockAllowed()) {
    return data;
  }

  throw new Error(`${context}: Supabase indisponivel em producao`);
}

function normalizeCatalogFilters(filters: CatalogProductFilters = {}) {
  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = Math.min(60, Math.max(1, Number(filters.pageSize ?? 24)));
  const query = filters.query?.trim() ?? "";
  const franchise = filters.franchise?.trim() ?? "";
  const status = filters.status ?? "all";

  return {
    franchise,
    page,
    pageSize,
    query,
    status,
  };
}

function filterFallbackProducts(filters: ReturnType<typeof normalizeCatalogFilters>) {
  const filtered = fallbackProducts.filter((product) => {
    const matchesQuery = filters.query
      ? `${product.name} ${product.sku} ${product.franchise}`
          .toLowerCase()
          .includes(filters.query.toLowerCase())
      : true;
    const matchesFranchise = filters.franchise ? product.franchise === filters.franchise : true;
    const matchesStatus = filters.status === "all" ? true : product.status === filters.status;

    return matchesQuery && matchesFranchise && matchesStatus;
  });
  const from = (filters.page - 1) * filters.pageSize;
  const pageItems = filtered.slice(from, from + filters.pageSize);

  return {
    data: pageItems,
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / filters.pageSize)),
    },
  };
}

export async function getCatalogProductsPage(filtersInput: CatalogProductFilters = {}): Promise<CatalogProductPage> {
  noStore();
  const filters = normalizeCatalogFilters(filtersInput);

  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }

  const supabase = getPublicSupabase();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id,name,slug,funko_number,description,status,franchises!inner(name,slug),product_variants!inner(sku,condition,type,source,sale_price,market_price,status)",
      { count: "exact" },
    )
    .eq("status", "active")
    .order("name", { ascending: true })
    .range(from, to);

  if (filters.query) {
    const safeQuery = filters.query.replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = query.or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  if (filters.franchise) {
    query = query.eq("franchises.slug", filters.franchise);
  }

  if (filters.status !== "all") {
    query = query.eq("product_variants.status", filters.status);
  }

  const { count, data, error } = await query;

  if (error || !data) {
    console.error("Failed to load catalog products", error);
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }

  const products = (data as unknown as ProductRow[])
    .filter((row) => row.product_variants.length > 0)
    .map(mapProduct);

  return {
    data: products,
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: count ?? products.length,
      totalPages: Math.max(1, Math.ceil((count ?? products.length) / filters.pageSize)),
    },
  };
}

export async function getCatalogProducts(filters: CatalogProductFilters = {}) {
  const page = await getCatalogProductsPage(filters);
  return page.data;
}

export async function getCatalogProductBySlug(slug: string) {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(getProductBySlug(slug), "Produto publico");
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,funko_number,description,status,franchises!inner(name,slug),product_variants!inner(sku,condition,type,source,sale_price,market_price,status)",
    )
    .eq("status", "active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load catalog product", error);
    return undefined;
  }

  return mapProduct(data as unknown as ProductRow, 0);
}

export async function getCatalogFranchises() {
  noStore();

  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(fallbackFranchises, "Franquias publicas");
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("franchises")
    .select("id,name,slug")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error || !data) {
    console.error("Failed to load catalog franchises", error);
    return fallbackOrThrow(fallbackFranchises, "Franquias publicas");
  }

  return data;
}
