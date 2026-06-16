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

type CatalogCardRow = {
  category_name?: string | null;
  condition: VariantRow["condition"] | null;
  created_at?: string | null;
  franchise_id?: string | null;
  franchise_name?: string | null;
  franchise_slug?: string | null;
  funko_number?: string | null;
  gallery_image_url?: string | null;
  has_order_variant?: boolean | null;
  has_preorder_variant?: boolean | null;
  has_ready_variant?: boolean | null;
  has_special_variant?: boolean | null;
  has_visible_variant?: boolean | null;
  id: string;
  main_image_url?: string | null;
  market_price: number | string | null;
  name: string;
  sale_price: number | string | null;
  sku: string | null;
  slug: string;
  special_label: string | null;
  special_tags: string[] | null;
  source: VariantRow["source"] | null;
  status?: string;
  subcategory_name?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_slug?: string | null;
  type: VariantRow["type"] | null;
  variant_id: string | null;
  variant_status: VariantRow["status"] | null;
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
  slug: string;
  name: string;
  subcategories: Array<{
    slug: string;
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
    description: "Coleção especial Piticas.",
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
    description: "Coleção especial Copag.",
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
    description: "Coleção especial Panini.",
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

const catalogDetailSelect =
  "id,name,slug,franchise_id,supplier_id,funko_number,category_name,subcategory_name,external_catalog_code,description,main_image_url,status,created_at,franchises(name,slug),suppliers(name,slug),product_images(image_url,sort_order),product_variants!inner(id,sku,condition,type,special_label,special_tags,source,sale_price,market_price,status)";

const catalogCardSelect =
  "id,name,slug,franchise_id,franchise_name,franchise_slug,supplier_id,supplier_name,supplier_slug,funko_number,category_name,subcategory_name,main_image_url,gallery_image_url,status,created_at,variant_id,sku,condition,type,special_label,special_tags,source,sale_price,market_price,variant_status,has_visible_variant,has_ready_variant,has_order_variant,has_preorder_variant,has_special_variant";

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

export function normalizeCatalogTokenValue(value: string | null | undefined) {
  return normalizeCatalogToken(value);
}

function getFranchise(franchises: ProductRow["franchises"]) {
  if (Array.isArray(franchises)) {
    return franchises[0] ?? null;
  }

  return franchises ?? null;
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

function normalizeCatalogToken(value: string | null | undefined) {
  return normalizeSlug((value ?? "").trim());
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

function getCatalogCardImages(row: CatalogCardRow) {
  return uniqueUrls([row.main_image_url, row.gallery_image_url]);
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
  const franchise = getFranchise(row.franchises);
  const supplier = getSupplier(row.suppliers);

  return {
    category: row.category_name ?? undefined,
    condition: conditionLabel[variant?.condition ?? "new"],
    createdAt: row.created_at ?? undefined,
    description: row.description ?? "Produto Smart Funkos com atendimento pelo WhatsApp.",
    franchise: franchise?.name ?? "Smart Funkos",
    franchiseSlug: franchise?.slug,
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
    supplierName: supplier?.name,
    supplierSlug: supplier?.slug,
    tone: toneByIndex[index % toneByIndex.length],
    type: typeLabel[variant?.type ?? "common"],
    variantId: variant?.id,
  };
}

function mapCatalogCardProduct(
  row: CatalogCardRow,
  index: number,
): Product {
  const images = getCatalogCardImages(row);
  const specialTags = row.special_tags?.filter(Boolean) ?? [];
  const type = row.type ?? "common";

  return {
    category: row.category_name ?? undefined,
    condition: conditionLabel[row.condition ?? "new"],
    createdAt: row.created_at ?? undefined,
    description: "Produto Smart Funkos com atendimento pelo WhatsApp.",
    franchise: row.franchise_name ?? "Smart Funkos",
    franchiseSlug: row.franchise_slug ?? undefined,
    funkoNumber: row.funko_number ?? "000",
    id: row.id,
    imageAlt: row.name,
    images,
    imageUrl: images[0],
    isSpecial:
      row.has_special_variant === true ||
      type !== "common" ||
      Boolean(row.special_label) ||
      specialTags.length > 0,
    marketPrice: row.market_price ? Number(row.market_price) : undefined,
    name: row.name,
    price: Number(row.sale_price ?? 0),
    sku: row.sku ?? "SF-0000",
    slug: row.slug,
    specialLabel: row.special_label ?? undefined,
    specialTags,
    source: sourceLabel[row.source ?? "own_stock"],
    status: toProductStatus(row.variant_status ?? undefined),
    subcategory: row.subcategory_name ?? undefined,
    supplierId: row.supplier_id ?? undefined,
    supplierName: row.supplier_name ?? undefined,
    supplierSlug: row.supplier_slug ?? undefined,
    tone: toneByIndex[index % toneByIndex.length],
    type: typeLabel[type],
    variantId: row.variant_id ?? undefined,
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
  const category = normalizeCatalogToken(filters.category?.trim() ?? "");
  const filter = filters.filter && validFilters.includes(filters.filter) ? filters.filter : "all";
  const requestedPage = Number(filters.page ?? 1);
  const requestedPageSize = Number(filters.pageSize ?? 24);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(60, Math.max(1, requestedPageSize))
    : 24;
  const query = filters.query?.trim() ?? "";
  const franchise = normalizeCatalogToken(filters.franchise?.trim() ?? "");
  const sort =
    filters.sort && validSorts.includes(filters.sort)
      ? filters.sort
      : filter === "new"
        ? "newest"
        : "relevance";
  const subcategory = category ? normalizeCatalogToken(filters.subcategory?.trim() ?? "") : "";
  const supplier = normalizeCatalogToken(filters.supplier?.trim() ?? "");

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

function matchesCatalogValue(source: string | null | undefined, filter: string) {
  if (!filter) {
    return true;
  }

  return normalizeCatalogToken(source) === normalizeCatalogToken(filter);
}

function filterFallbackProducts(filters: ReturnType<typeof normalizeCatalogFilters>) {
  const filtered = fallbackProducts.filter((product) => {
    const matchesQuery = filters.query
      ? `${product.name} ${product.slug} ${product.sku} ${product.franchise} ${product.funkoNumber} ${product.category ?? ""} ${product.subcategory ?? ""} ${(product.specialTags ?? []).join(" ")}`
          .toLowerCase()
          .includes(filters.query.toLowerCase())
      : true;
    const matchesFranchise = matchesCatalogValue(product.franchise, filters.franchise);
    const matchesCategory = matchesCatalogValue(product.category, filters.category);
    const matchesSubcategory = matchesCatalogValue(product.subcategory, filters.subcategory);
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

function emptyCatalogPage(filters: ReturnType<typeof normalizeCatalogFilters>): CatalogProductPage {
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

function sanitizePostgrestSearchValue(value: string) {
  return value.replace(/[(),%_*]/g, " ").trim();
}

function getCatalogSearchTerms(query: string) {
  return query
    .split(/\s+/)
    .map(sanitizePostgrestSearchValue)
    .filter(Boolean)
    .slice(0, 4);
}

async function resolveCatalogCategoryFilters(
  filters: ReturnType<typeof normalizeCatalogFilters>,
) {
  if (!filters.category) {
    return {
      categoryName: undefined,
      subcategoryName: undefined,
    };
  }

  const categories = await getCatalogCategories();
  const category = categories.find((item) => item.slug === filters.category);

  if (!category) {
    return null;
  }

  if (!filters.subcategory) {
    return {
      categoryName: category.name,
      subcategoryName: undefined,
    };
  }

  const subcategory = category.subcategories.find(
    (item) => item.slug === filters.subcategory,
  );

  if (!subcategory) {
    return null;
  }

  return {
    categoryName: category.name,
    subcategoryName: subcategory.name,
  };
}

async function getCatalogProductsPageUncached(
  filters: ReturnType<typeof normalizeCatalogFilters>,
): Promise<CatalogProductPage> {
  if (!hasSupabasePublicEnv()) {
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }

  const supabase = getPublicSupabase();
  const categoryFilters = await resolveCatalogCategoryFilters(filters);

  if (!categoryFilters) {
    return emptyCatalogPage(filters);
  }

  const categoryFilterValues = categoryFilters;

  function buildQuery(page: number) {
    const from = (page - 1) * filters.pageSize;
    let query = supabase
      .from("catalog_product_cards")
      .select(catalogCardSelect, { count: "exact" })
      .eq("has_visible_variant", true);

    if (filters.franchise) {
      query = query.eq("franchise_slug", filters.franchise);
    }

    if (filters.supplier) {
      query = query.eq("supplier_slug", filters.supplier);
    }

    if (categoryFilterValues.categoryName) {
      query = query.eq("category_name", categoryFilterValues.categoryName);
    }

    if (categoryFilterValues.subcategoryName) {
      query = query.eq("subcategory_name", categoryFilterValues.subcategoryName);
    }

    if (filters.filter === "ready") {
      query = query.eq("has_ready_variant", true);
    }

    if (filters.filter === "order") {
      query = query.eq("has_order_variant", true);
    }

    if (filters.filter === "preorder") {
      query = query.eq("has_preorder_variant", true);
    }

    if (filters.filter === "specials") {
      query = query.eq("has_special_variant", true);
    }

    for (const term of getCatalogSearchTerms(filters.query)) {
      const pattern = `%${term}%`;
      query = query.or(
        [
          `name.ilike.${pattern}`,
          `slug.ilike.${pattern}`,
          `funko_number.ilike.${pattern}`,
          `category_name.ilike.${pattern}`,
          `subcategory_name.ilike.${pattern}`,
          `franchise_name.ilike.${pattern}`,
          `supplier_name.ilike.${pattern}`,
          `sku.ilike.${pattern}`,
          `special_label.ilike.${pattern}`,
        ].join(","),
      );
    }

    if (filters.sort === "newest" || filters.filter === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (filters.sort === "price_asc") {
      query = query.order("sale_price", { ascending: true, nullsFirst: false });
    } else if (filters.sort === "price_desc") {
      query = query.order("sale_price", { ascending: false, nullsFirst: false });
    } else if (filters.sort === "ready_first") {
      query = query.order("has_ready_variant", { ascending: false }).order("name", { ascending: true });
    } else if (filters.sort === "specials_first") {
      query = query.order("has_special_variant", { ascending: false }).order("name", { ascending: true });
    } else {
      query = query.order("name", { ascending: true });
    }

    return query.range(from, from + filters.pageSize - 1);
  }

  try {
    let page = filters.page;
    const { count, error, data: firstPageData } = await buildQuery(page);
    let data = firstPageData;

    if (error) {
      throw error;
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

    if (total > 0 && page > totalPages) {
      page = totalPages;
      const lastPageResult = await buildQuery(page);

      if (lastPageResult.error) {
        throw lastPageResult.error;
      }

      data = lastPageResult.data;
    }

    return {
      data: ((data ?? []) as CatalogCardRow[]).map((row, index) =>
        mapCatalogCardProduct(row, (page - 1) * filters.pageSize + index),
      ),
      meta: {
        page,
        pageSize: filters.pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    logCatalogError("Failed to load catalog product cards", error);
    return fallbackOrThrow(filterFallbackProducts(filters), "Catalogo publico");
  }
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

export async function getRelatedProducts(product: Product, limit = 4) {
  const groups = await Promise.all([
    product.franchiseSlug
      ? getCatalogProducts({
          franchise: product.franchiseSlug,
          pageSize: limit + 1,
          sort: "specials_first",
        })
      : Promise.resolve([]),
    product.supplierSlug
      ? getCatalogProducts({
          pageSize: limit + 1,
          supplier: product.supplierSlug,
          sort: "specials_first",
        })
      : Promise.resolve([]),
    product.category
      ? getCatalogProducts({
          category: normalizeCatalogTokenValue(product.category),
          pageSize: limit + 1,
          sort: "specials_first",
          subcategory: normalizeCatalogTokenValue(product.subcategory),
        })
      : Promise.resolve([]),
    getCatalogProducts({
      filter: "specials",
      pageSize: limit + 1,
      sort: "specials_first",
    }),
  ]);
  const seen = new Set<string>();

  return groups
    .flat()
    .filter((candidate) => {
      if (candidate.id === product.id || seen.has(candidate.id)) {
        return false;
      }

      seen.add(candidate.id);
      return true;
    })
    .slice(0, limit);
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
  const categoryBySlug = new Map<
    string,
    {
      name: string;
      subcategories: Map<string, string>;
    }
  >();

  for (const row of rows) {
    const category = row.category_name?.trim();

    if (!category) {
      continue;
    }

    const subcategory = row.subcategory_name?.trim();
    const categorySlug = normalizeCatalogToken(category);
    const current =
      categoryBySlug.get(categorySlug) ??
      {
        name: category,
        subcategories: new Map<string, string>(),
      };

    if (subcategory) {
      const subcategorySlug = normalizeCatalogToken(subcategory);
      current.subcategories.set(subcategorySlug, subcategory);
    }

    current.name = category;
    categoryBySlug.set(categorySlug, current);
  }

  return Array.from(categoryBySlug.entries())
    .map(([slug, { name, subcategories }]) => ({
      name,
      slug,
      subcategories: Array.from(subcategories.entries())
        .sort((first, second) => first[1].localeCompare(second[1], "pt-BR"))
        .map(([subcategorySlug, subcategoryName]) => ({
          name: subcategoryName,
          slug: subcategorySlug,
        })),
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
