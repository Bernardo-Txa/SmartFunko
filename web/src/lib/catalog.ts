import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";
import { env, hasSupabasePublicEnv, isDevelopmentMockAllowed } from "@/lib/env";
import {
  franchises as fallbackFranchises,
  getProductBySlug,
  products as fallbackProducts,
} from "@/lib/mock-data";

type VariantRow = {
  condition: "new" | "used" | "damaged_box";
  id?: string;
  market_price: number | string | null;
  sale_price: number | string;
  sku: string;
  special_label: string | null;
  special_tags: string[] | null;
  source: "own_stock" | "national" | "international" | "preorder";
  status: "available" | "order_only" | "preorder" | "sold_out" | "hidden";
  type: "common" | "exclusive" | "chase" | "glow" | "special";
};

type ProductRow = {
  category_name?: string | null;
  created_at?: string | null;
  description?: string | null;
  external_catalog_code?: string | null;
  franchise_id?: string | null;
  franchises?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  funko_number?: string | null;
  id: string;
  main_image_url?: string | null;
  name: string;
  slug: string;
  status?: string;
  subcategory_name?: string | null;
  supplier_id?: string | null;
  suppliers?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  product_images?: Array<{
    image_url: string;
    sort_order: number | null;
  }> | null;
  product_variants?: VariantRow[] | null;
};

type CatalogQueryError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

const toneByIndex: Product["tone"][] = ["teal", "pink", "amber", "indigo"];

const conditionLabel: Record<VariantRow["condition"], Product["condition"]> = {
  damaged_box: "Caixa avariada",
  new: "Novo",
  used: "Usado",
};

const typeLabel: Record<VariantRow["type"], Product["type"]> = {
  chase: "Chase",
  common: "Comum",
  exclusive: "Exclusivo",
  glow: "Glow",
  special: "Especial",
};

const sourceLabel: Record<VariantRow["source"], Product["source"]> = {
  international: "Importado",
  national: "Encomenda nacional",
  own_stock: "Pronta-entrega",
  preorder: "Pré-venda",
};

export type CatalogProductFilter = "all" | "new" | "ready" | "order" | "preorder" | "specials";

export type CatalogProductSort =
  | "name"
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "ready_first"
  | "specials_first";

export type CatalogProductFilters = {
  category?: string;
  filter?: CatalogProductFilter;
  franchise?: string;
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: CatalogProductSort;
  subcategory?: string;
  supplier?: string;
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

export type CatalogCategory = {
  name: string;
  subcategories: Array<{
    name: string;
  }>;
};

export type CatalogSupplier = {
  accent_color: string | null;
  banner_url: string | null;
  description: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  slug: string;
  sort_order: number;
  status: string;
  website_url: string | null;
};

const fallbackSuppliers: CatalogSupplier[] = [
  {
    accent_color: null,
    banner_url: null,
    description: "Colecao especial Piticas.",
    id: "piticas",
    logo_url: "/brand/piticas.webp",
    name: "Piticas",
    slug: "piticas",
    sort_order: 10,
    status: "active",
    website_url: null,
  },
  {
    accent_color: null,
    banner_url: null,
    description: "Colecao especial Copag.",
    id: "copag",
    logo_url: null,
    name: "Copag",
    slug: "copag",
    sort_order: 20,
    status: "active",
    website_url: null,
  },
  {
    accent_color: null,
    banner_url: null,
    description: "Colecao especial Panini.",
    id: "panini",
    logo_url: null,
    name: "Panini",
    slug: "panini",
    sort_order: 30,
    status: "active",
    website_url: null,
  },
];

const categoryOrder = [
  "Disney",
  "Heróis/Vilões",
  "Animes",
  "Filmes e Séries",
  "Música",
  "Esporte",
  "Games",
];

const CATALOG_LIST_REVALIDATE_SECONDS = 120;
const CATALOG_DETAIL_REVALIDATE_SECONDS = 300;
const CATALOG_OPTIONS_REVALIDATE_SECONDS = 900;
const CATALOG_LIST_MAX_ROWS = 5000;

const catalogListSelect =
  "id,name,slug,franchise_id,supplier_id,funko_number,category_name,subcategory_name,external_catalog_code,main_image_url,status,created_at,franchises(name,slug),suppliers(name,slug),product_images(image_url,sort_order),product_variants!inner(id,sku,condition,type,special_label,special_tags,source,sale_price,market_price,status)";

const catalogDetailSelect =
  "id,name,slug,franchise_id,supplier_id,funko_number,category_name,subcategory_name,external_catalog_code,description,main_image_url,status,created_at,franchises(name,slug),suppliers(name,slug),product_images(image_url,sort_order),product_variants!inner(id,sku,condition,type,special_label,special_tags,source,sale_price,market_price,status)";

function getPublicSupabase() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function shouldUseCatalogFallback() {
  return isDevelopmentMockAllowed();
}

function getFranchiseName(franchises: ProductRow["franchises"]) {
  if (Array.isArray(franchises)) {
    return franchises[0]?.name;
  }

  return franchises?.name;
}

function getSupplier(suppliers: ProductRow["suppliers"]) {
  if (Array.isArray(suppliers)) {
    return suppliers[0];
  }

  return suppliers ?? null;
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const url of urls) {
    const normalized = url?.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function getProductImages(row: ProductRow) {
  const additionalImages = (row.product_images ?? [])
    .slice()
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    .map((image) => image.image_url);

  return uniqueUrls([row.main_image_url, ...additionalImages]);
}

function isVisibleVariant(variant: VariantRow) {
  return variant.status !== "hidden";
}

function variantMatchesFilter(variant: VariantRow, filter: CatalogProductFilter) {
  if (!isVisibleVariant(variant)) {
    return false;
  }

  if (filter === "ready") {
    return variant.source === "own_stock" || variant.status === "available";
  }

  if (filter === "order") {
    return (
      variant.source === "national" ||
      variant.source === "international" ||
      variant.status === "order_only"
    );
  }

  if (filter === "preorder") {
    return variant.source === "preorder" || variant.status === "preorder";
  }

  if (filter === "specials") {
    return variant.type !== "common" || Boolean(variant.special_label) || (variant.special_tags ?? []).length > 0;
  }

  return true;
}

function variantPriority(variant: VariantRow, filter: CatalogProductFilter) {
  let score = 0;

  if (filter !== "all" && variantMatchesFilter(variant, filter)) {
    score -= 100;
  }

  if (filter === "specials" && variant.type !== "common") {
    score -= 40;
  }

  if (variant.type !== "common") {
    score -= 8;
  }

  if (variant.source === "own_stock") {
    score -= 6;
  }

  if (variant.status === "available") {
    score -= 5;
  }

  if (variant.status === "sold_out") {
    score += 20;
  }

  return score;
}

function pickVariant(row: ProductRow, filter: CatalogProductFilter) {
  const variants = (row.product_variants ?? []).filter(isVisibleVariant);

  return variants
    .slice()
    .sort((first, second) => variantPriority(first, filter) - variantPriority(second, filter))[0];
}

function toProductStatus(status: VariantRow["status"] | undefined): Product["status"] {
  if (!status || status === "hidden") {
    return "sold_out";
  }

  return status;
}

function mapProduct(row: ProductRow, index: number, filter: CatalogProductFilter): Product {
  const variant = pickVariant(row, filter);
  const images = getProductImages(row);
  const specialTags = variant?.special_tags?.filter(Boolean) ?? [];

  return {
    category: row.category_name ?? undefined,
    condition: conditionLabel[variant?.condition ?? "new"],
    createdAt: row.created_at ?? undefined,
    description: row.description ?? "Produto Smart Funkos com atendimento pelo WhatsApp.",
    franchise: getFranchiseName(row.franchises) ?? "Smart Funkos",
    funkoNumber: row.funko_number ?? "000",
    id: row.id,
    imageAlt: row.name,
    images,
    imageUrl: images[0],
    isSpecial: variant ? variant.type !== "common" || Boolean(variant.special_label) || specialTags.length > 0 : false,
    marketPrice: variant?.market_price ? Number(variant.market_price) : undefined,
    name: row.name,
    price: Number(variant?.sale_price ?? 0),
    sku: variant?.sku ?? "SF-0000",
    slug: row.slug,
    specialLabel: variant?.special_label ?? undefined,
    specialTags,
    source: sourceLabel[variant?.source ?? "own_stock"],
    status: toProductStatus(variant?.status),
    subcategory: row.subcategory_name ?? undefined,
    supplierId: row.supplier_id ?? undefined,
    supplierName: getSupplier(row.suppliers)?.name,
    supplierSlug: getSupplier(row.suppliers)?.slug,
    tone: toneByIndex[index % toneByIndex.length],
    type: typeLabel[variant?.type ?? "common"],
    variantId: variant?.id,
  };
}

function fallbackOrThrow<T>(data: T, context: string) {
  if (shouldUseCatalogFallback()) {
    return data;
  }

  throw new Error(`${context}: Supabase indisponivel em producao`);
}

function isSchemaFallbackError(error: unknown) {
  const code = (error as CatalogQueryError | null)?.code;

  return code === "PGRST200" || code === "PGRST205" || code === "42P01";
}

function logCatalogError(context: string, error: unknown) {
  if (isSchemaFallbackError(error)) {
    return;
  }

  console.error(context, error);
}

function normalizeCatalogFilters(filters: CatalogProductFilters = {}) {
  const validFilters: CatalogProductFilter[] = ["all", "new", "ready", "order", "preorder", "specials"];
  const validSorts: CatalogProductSort[] = [
    "name",
    "relevance",
    "newest",
    "price_asc",
    "price_desc",
    "ready_first",
    "specials_first",
  ];
  const category = filters.category?.trim() ?? "";
  const filter = filters.filter && validFilters.includes(filters.filter) ? filters.filter : "all";
  const requestedPage = Number(filters.page ?? 1);
  const requestedPageSize = Number(filters.pageSize ?? 24);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(60, Math.max(1, requestedPageSize))
    : 24;
  const query = filters.query?.trim() ?? "";
  const franchise = filters.franchise?.trim() ?? "";
  const sort =
    filters.sort && validSorts.includes(filters.sort)
      ? filters.sort
      : filter === "new"
        ? "newest"
        : "relevance";
  const subcategory = filters.subcategory?.trim() ?? "";
  const supplier = filters.supplier?.trim() ?? "";

  return {
    category,
    filter,
    franchise,
    page,
    pageSize,
    query,
    sort,
    subcategory,
    supplier,
  };
}

function fallbackProductMatchesFilter(product: Product, filter: CatalogProductFilter) {
  if (filter === "ready") {
    return product.source === "Pronta-entrega" || product.status === "available";
  }

  if (filter === "order") {
    return (
      product.source === "Encomenda nacional" ||
      product.source === "Importado" ||
      product.status === "order_only"
    );
  }

  if (filter === "preorder") {
    return product.source === "Pré-venda" || product.status === "preorder";
  }

  if (filter === "specials") {
    return (
      product.isSpecial === true ||
      product.type !== "Comum" ||
      Boolean(product.specialLabel) ||
      Boolean(product.specialTags?.length)
    );
  }

  if (filter === "new") {
    return true;
  }

  return true;
}

function filterFallbackProducts(filters: ReturnType<typeof normalizeCatalogFilters>) {
  const filtered = fallbackProducts.filter((product) => {
    const matchesQuery = filters.query
      ? `${product.name} ${product.slug} ${product.sku} ${product.franchise} ${product.funkoNumber} ${product.category ?? ""} ${product.subcategory ?? ""} ${product.supplierName ?? ""} ${(product.specialTags ?? []).join(" ")}`
          .toLowerCase()
          .includes(filters.query.toLowerCase())
      : true;
    const matchesFranchise = filters.franchise
      ? normalizeSlug(product.franchise) === filters.franchise
      : true;
    const matchesCategory = filters.category ? product.category === filters.category : true;
    const matchesSubcategory = filters.subcategory
      ? product.subcategory === filters.subcategory
      : true;
    const matchesSupplier = filters.supplier ? product.supplierSlug === filters.supplier : true;
    const matchesFilter = fallbackProductMatchesFilter(product, filters.filter);

    return matchesQuery && matchesFranchise && matchesCategory && matchesSubcategory && matchesSupplier && matchesFilter;
  });
  const sorted = sortProducts(filtered, filters);
  const totalPages = Math.max(1, Math.ceil(sorted.length / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const from = (page - 1) * filters.pageSize;
  const pageItems = sorted.slice(from, from + filters.pageSize);

  return {
    data: pageItems,
    meta: {
      page,
      pageSize: filters.pageSize,
      total: sorted.length,
      totalPages,
    },
  };
}

function rowMatchesFilter(row: ProductRow, filter: CatalogProductFilter) {
  return (row.product_variants ?? []).some((variant) => variantMatchesFilter(variant, filter));
}

function rowMatchesSearch(row: ProductRow, query: string) {
  if (!query) {
    return true;
  }

  const franchise = Array.isArray(row.franchises) ? row.franchises[0] : row.franchises;
  const supplier = getSupplier(row.suppliers);
  const variantText = (row.product_variants ?? [])
    .map((variant) =>
      [
        variant.sku,
        variant.special_label ?? "",
        variant.source,
        variant.status,
        variant.type,
        ...(variant.special_tags ?? []),
      ].join(" "),
    )
    .join(" ");
  const haystack = normalizeSearchText(
    [
      row.name,
      row.slug,
      row.funko_number ?? "",
      row.external_catalog_code ?? "",
      row.category_name ?? "",
      row.subcategory_name ?? "",
      franchise?.name ?? "",
      franchise?.slug ?? "",
      supplier?.name ?? "",
      supplier?.slug ?? "",
      variantText,
    ].join(" "),
  );

  return haystack.includes(normalizeSearchText(query));
}

function sortCatalogProducts(products: Product[], filter: CatalogProductFilter) {
  return products.sort((first, second) => {
    if (filter === "new") {
      const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;

      if (firstDate !== secondDate) {
        return secondDate - firstDate;
      }
    }

    if (filter === "specials" && first.isSpecial !== second.isSpecial) {
      return first.isSpecial ? -1 : 1;
    }

    const firstReady = first.source === "Pronta-entrega" || first.status === "available";
    const secondReady = second.source === "Pronta-entrega" || second.status === "available";

    if (firstReady !== secondReady) {
      return firstReady ? -1 : 1;
    }

    return first.name.localeCompare(second.name, "pt-BR");
  });
}

function sortProducts(products: Product[], filters: ReturnType<typeof normalizeCatalogFilters>) {
  return products.sort((first, second) => {
    if (filters.sort === "relevance") {
      return 0;
    }

    if (filters.sort === "newest") {
      const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
      const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;

      if (firstDate !== secondDate) {
        return secondDate - firstDate;
      }
    }

    if (filters.sort === "price_asc" && first.price !== second.price) {
      return first.price - second.price;
    }

    if (filters.sort === "price_desc" && first.price !== second.price) {
      return second.price - first.price;
    }

    if (filters.sort === "specials_first" && first.isSpecial !== second.isSpecial) {
      return first.isSpecial ? -1 : 1;
    }

    if (filters.sort === "ready_first") {
      const firstReady = first.source === "Pronta-entrega" || first.status === "available";
      const secondReady = second.source === "Pronta-entrega" || second.status === "available";

      if (firstReady !== secondReady) {
        return firstReady ? -1 : 1;
      }
    }

    return first.name.localeCompare(second.name, "pt-BR");
  });
}

async function getFranchiseIdBySlug(
  supabase: ReturnType<typeof getPublicSupabase>,
  slug: string,
) {
  const { data, error } = await supabase
    .from("franchises")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logCatalogError("Failed to resolve catalog franchise", error);
    return undefined;
  }

  return data?.id as string | undefined;
}

async function getSupplierIdBySlug(
  supabase: ReturnType<typeof getPublicSupabase>,
  slug: string,
) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    logCatalogError("Failed to resolve catalog supplier", error);
    return undefined;
  }

  return data?.id as string | undefined;
}

async function getCatalogProductsPageUncached(
  filters: ReturnType<typeof normalizeCatalogFilters>,
): Promise<CatalogProductPage> {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }

  const supabase = getPublicSupabase();
  const [franchiseId, supplierId] = await Promise.all([
    filters.franchise ? getFranchiseIdBySlug(supabase, filters.franchise) : Promise.resolve(undefined),
    filters.supplier ? getSupplierIdBySlug(supabase, filters.supplier) : Promise.resolve(undefined),
  ]);

  if (filters.franchise && !franchiseId) {
    return {
      data: [],
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: 0,
        totalPages: 1,
      },
    };
  }

  if (filters.supplier && !supplierId) {
    if (shouldUseCatalogFallback()) {
      return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
    }

    return {
      data: [],
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: 0,
        totalPages: 1,
      },
    };
  }

  let query = supabase.from("products").select(catalogListSelect).eq("status", "active");

  if (filters.sort === "newest" || filters.filter === "new") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("name", { ascending: true });
  }

  query = query.neq("product_variants.status", "hidden");
  query = query.range(0, CATALOG_LIST_MAX_ROWS - 1);

  if (franchiseId) {
    query = query.eq("franchise_id", franchiseId);
  }

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  if (filters.category) {
    query = query.eq("category_name", filters.category);
  }

  if (filters.subcategory) {
    query = query.eq("subcategory_name", filters.subcategory);
  }

  const { data, error } = await query;

  if (error || !data) {
    logCatalogError("Failed to load catalog products", error);
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }

  const filteredRows = (data as unknown as ProductRow[]).filter(
    (row) => rowMatchesFilter(row, filters.filter) && rowMatchesSearch(row, filters.query),
  );
  const products = filteredRows.map((row, index) =>
    mapProduct(row, index, filters.filter),
  );
  const sortedProducts = sortProducts(sortCatalogProducts(products, filters.filter), filters);
  const total = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const from = (page - 1) * filters.pageSize;
  const pageItems = sortedProducts.slice(from, from + filters.pageSize);

  return {
    data: pageItems,
    meta: {
      page,
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
  };
}

const getCachedCatalogProductsPage = unstable_cache(
  getCatalogProductsPageUncached,
  ["catalog-products-page"],
  {
    revalidate: CATALOG_LIST_REVALIDATE_SECONDS,
    tags: ["catalog-products"],
  },
);

export async function getCatalogProductsPage(filtersInput: CatalogProductFilters = {}): Promise<CatalogProductPage> {
  return getCachedCatalogProductsPage(normalizeCatalogFilters(filtersInput));
}

export async function getCatalogProducts(filters: CatalogProductFilters = {}) {
  const page = await getCatalogProductsPage(filters);
  return page.data;
}

async function getCatalogProductBySlugUncached(slug: string) {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(getProductBySlug(slug), "Produto publico");
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(catalogDetailSelect)
    .eq("status", "active")
    .neq("product_variants.status", "hidden")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    logCatalogError("Failed to load catalog product", error);
    return undefined;
  }

  const product = data as unknown as ProductRow;

  if (!rowMatchesFilter(product, "all")) {
    return undefined;
  }

  return mapProduct(product, 0, "all");
}

const getCachedCatalogProductBySlug = unstable_cache(
  getCatalogProductBySlugUncached,
  ["catalog-product-by-slug"],
  {
    revalidate: CATALOG_DETAIL_REVALIDATE_SECONDS,
    tags: ["catalog-products"],
  },
);

export async function getCatalogProductBySlug(slug: string) {
  return getCachedCatalogProductBySlug(slug);
}

async function getCatalogFranchisesUncached() {
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
    logCatalogError("Failed to load catalog franchises", error);
    return fallbackOrThrow(fallbackFranchises, "Franquias publicas");
  }

  return data;
}

const getCachedCatalogFranchises = unstable_cache(
  getCatalogFranchisesUncached,
  ["catalog-franchises"],
  {
    revalidate: CATALOG_OPTIONS_REVALIDATE_SECONDS,
    tags: ["catalog-options"],
  },
);

export async function getCatalogFranchises() {
  return getCachedCatalogFranchises();
}

async function getCatalogSuppliersUncached() {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(fallbackSuppliers, "Fornecedores publicos");
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,name,slug,description,logo_url,banner_url,accent_color,website_url,status,sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    logCatalogError("Failed to load catalog suppliers", error);
    return fallbackOrThrow(fallbackSuppliers, "Fornecedores publicos");
  }

  return data as CatalogSupplier[];
}

const getCachedCatalogSuppliers = unstable_cache(
  getCatalogSuppliersUncached,
  ["catalog-suppliers"],
  {
    revalidate: CATALOG_OPTIONS_REVALIDATE_SECONDS,
    tags: ["catalog-options"],
  },
);

export async function getCatalogSuppliers() {
  return getCachedCatalogSuppliers();
}

async function getCatalogSupplierBySlugUncached(slug: string) {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(
      fallbackSuppliers.find((supplier) => supplier.slug === slug),
      "Fornecedor publico",
    );
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,name,slug,description,logo_url,banner_url,accent_color,website_url,status,sort_order")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    logCatalogError("Failed to load catalog supplier", error);
    return shouldUseCatalogFallback()
      ? fallbackSuppliers.find((supplier) => supplier.slug === slug)
      : undefined;
  }

  return data as CatalogSupplier;
}

const getCachedCatalogSupplierBySlug = unstable_cache(
  getCatalogSupplierBySlugUncached,
  ["catalog-supplier-by-slug"],
  {
    revalidate: CATALOG_OPTIONS_REVALIDATE_SECONDS,
    tags: ["catalog-options"],
  },
);

export async function getCatalogSupplierBySlug(slug: string) {
  return getCachedCatalogSupplierBySlug(slug);
}

function buildCatalogCategories(
  rows: Array<{
    category_name: string | null;
    subcategory_name: string | null;
  }>,
): CatalogCategory[] {
  const categoryByName = new Map<string, Set<string>>();

  for (const row of rows) {
    const category = row.category_name?.trim();

    if (!category) {
      continue;
    }

    const subcategory = row.subcategory_name?.trim();
    const subcategories = categoryByName.get(category) ?? new Set<string>();

    if (subcategory) {
      subcategories.add(subcategory);
    }

    categoryByName.set(category, subcategories);
  }

  return Array.from(categoryByName.entries())
    .map(([name, subcategories]) => ({
      name,
      subcategories: Array.from(subcategories)
        .sort((first, second) => first.localeCompare(second, "pt-BR"))
        .map((subcategory) => ({ name: subcategory })),
    }))
    .sort((first, second) => {
      const firstIndex = categoryOrder.indexOf(first.name);
      const secondIndex = categoryOrder.indexOf(second.name);

      if (firstIndex !== -1 || secondIndex !== -1) {
        return (
          (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
          (secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex)
        );
      }

      return first.name.localeCompare(second.name, "pt-BR");
    });
}

function getFallbackCatalogCategories() {
  return buildCatalogCategories(
    fallbackProducts.map((product) => ({
      category_name: product.category ?? null,
      subcategory_name: product.subcategory ?? null,
    })),
  );
}

async function loadCatalogCategoryRowsFromProducts(supabase: ReturnType<typeof getPublicSupabase>) {
  const rows: Array<{
    category_name: string | null;
    subcategory_name: string | null;
  }> = [];
  const pageSize = 1000;

  for (let from = 0; from < 30000; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("category_name,subcategory_name")
      .eq("status", "active")
      .not("category_name", "is", null)
      .order("category_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    rows.push(
      ...((data ?? []) as Array<{
        category_name: string | null;
        subcategory_name: string | null;
      }>),
    );

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function getCatalogCategoriesUncached() {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(getFallbackCatalogCategories(), "Categorias publicas");
  }

  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("catalog_category_options")
    .select("category_name,subcategory_name")
    .order("category_name", { ascending: true })
    .order("subcategory_name", { ascending: true });

  if (error) {
    try {
      const rows = await loadCatalogCategoryRowsFromProducts(supabase);
      return buildCatalogCategories(rows);
    } catch (fallbackError) {
      console.error("Failed to load catalog categories", fallbackError);
      return fallbackOrThrow(getFallbackCatalogCategories(), "Categorias publicas");
    }
  }

  return buildCatalogCategories(
    (data ?? []) as Array<{
      category_name: string | null;
      subcategory_name: string | null;
    }>,
  );
}

const getCachedCatalogCategories = unstable_cache(
  getCatalogCategoriesUncached,
  ["catalog-categories"],
  {
    revalidate: CATALOG_OPTIONS_REVALIDATE_SECONDS,
    tags: ["catalog-options"],
  },
);

export async function getCatalogCategories() {
  return getCachedCatalogCategories();
}
