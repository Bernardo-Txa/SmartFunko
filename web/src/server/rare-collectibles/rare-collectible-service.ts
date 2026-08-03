import "server-only";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { formatCurrency } from "@/lib/format";
import { normalizeProductType } from "@/lib/product-types";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import {
  ProductService,
  type CreateProductVariantInput,
  type UpdateProductVariantInput,
} from "@/server/products/product-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const rareCollectibleStatusSchema = z.enum([
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
]);

export const rareCollectibleVisibilitySchema = z.enum(["visible", "hidden", "archive"]);
export const rareCollectiblePurchaseModeSchema = z.enum(["checkout", "whatsapp", "manual"]);

const nullableTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().nullable().optional(),
);

const optionalTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const optionalUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().url().nullable().optional(),
);

const textArraySchema = z.preprocess(
  (value) => {
    const rawEntries = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[|,]/)
        : [];

    return rawEntries
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  },
  z.array(z.string()).default([]),
).transform((entries) => Array.from(new Set(entries)));

const moneySchema = z.number().positive();
const optionalMoneySchema = z.number().nonnegative().nullable().optional();

export const createRareCollectibleSchema = z.object({
  allowReservation: z.boolean().default(false),
  authenticationCode: nullableTextSchema,
  authenticationImageUrl: optionalUrlSchema,
  autographDate: nullableTextSchema,
  autographLocation: nullableTextSchema,
  availabilityMessage: nullableTextSchema,
  badgeLabel: z.string().trim().min(2).default("Autenticidade certificada"),
  category: z.string().trim().min(2).default("Cultura Pop"),
  certificateImageUrl: optionalUrlSchema,
  certificateType: nullableTextSchema,
  certifierName: nullableTextSchema,
  checkoutUrl: optionalUrlSchema,
  collectibleYear: nullableTextSchema,
  conditionNotes: nullableTextSchema,
  coverImageUrl: optionalUrlSchema,
  description: nullableTextSchema,
  displayOrder: z.number().int().default(0),
  edition: nullableTextSchema,
  franchiseId: z.string().uuid().nullable().optional(),
  funkoNumber: nullableTextSchema,
  includedItems: textArraySchema,
  installmentsMax: z.number().int().min(1).max(24).default(10),
  isFeatured: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  marketPrice: optionalMoneySchema,
  name: z.string().trim().min(2),
  packagingImageUrl: optionalUrlSchema,
  productType: z.string().trim().optional().transform((value) => normalizeProductType(value)),
  publicVisibility: rareCollectibleVisibilitySchema.default("visible"),
  purchaseMode: rareCollectiblePurchaseModeSchema.default("whatsapp"),
  quantityAvailable: z.number().int().min(0).default(1),
  reservationDays: z.number().int().min(1).max(30).nullable().optional(),
  salePrice: moneySchema,
  seoDescription: nullableTextSchema,
  seoTitle: nullableTextSchema,
  serialImageUrl: optionalUrlSchema,
  serialNumber: nullableTextSchema,
  shareImageUrl: optionalUrlSchema,
  shortTitle: nullableTextSchema,
  signerName: nullableTextSchema,
  signerRole: nullableTextSchema,
  sku: nullableTextSchema,
  slug: optionalTextSchema,
  soldVisibility: rareCollectibleVisibilitySchema.default("visible"),
  status: rareCollectibleStatusSchema.default("draft"),
  story: nullableTextSchema,
  tags: textArraySchema,
  verificationUrl: optionalUrlSchema,
  authenticityNotes: nullableTextSchema,
  whatsappUrl: nullableTextSchema,
});

export const updateRareCollectibleSchema = createRareCollectibleSchema.partial();

export type RareCollectibleStatus = z.infer<typeof rareCollectibleStatusSchema>;
export type RareCollectibleVisibility = z.infer<typeof rareCollectibleVisibilitySchema>;
export type RareCollectiblePurchaseMode = z.infer<typeof rareCollectiblePurchaseModeSchema>;
export type CreateRareCollectibleInput = z.infer<typeof createRareCollectibleSchema>;
export type UpdateRareCollectibleInput = z.infer<typeof updateRareCollectibleSchema>;

export type RareCollectibleFilter = {
  category?: string;
  query?: string;
  sort?: "featured" | "newest" | "price_asc" | "price_desc";
  status?: RareCollectibleStatus | "all";
};

export type RareCollectible = {
  allowReservation: boolean;
  authenticationCode?: string | null;
  authenticationImageUrl?: string | null;
  autographDate?: string | null;
  autographLocation?: string | null;
  availabilityMessage?: string | null;
  badgeLabel: string;
  category: string;
  certificateImageUrl?: string | null;
  certificateType?: string | null;
  certifierName?: string | null;
  checkoutUrl?: string | null;
  collectibleYear?: string | null;
  conditionNotes?: string | null;
  coverImageUrl?: string | null;
  createdAt: string;
  description?: string | null;
  displayOrder: number;
  edition?: string | null;
  franchiseId?: string | null;
  funkoNumber?: string | null;
  galleryImages: Array<{ id: string; imageUrl: string; sortOrder: number }>;
  id: string;
  includedItems: string[];
  installmentsMax: number;
  isFeatured: boolean;
  isHistoric: boolean;
  isPublic: boolean;
  marketPrice?: number | null;
  name: string;
  packagingImageUrl?: string | null;
  price: number;
  productId: string;
  productType: string;
  publicVisibility: RareCollectibleVisibility;
  purchaseMode: RareCollectiblePurchaseMode;
  quantityAvailable: number;
  reservationDays?: number | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
  serialImageUrl?: string | null;
  serialNumber?: string | null;
  shareImageUrl?: string | null;
  shortTitle?: string | null;
  signerName?: string | null;
  signerRole?: string | null;
  sku: string;
  slug: string;
  soldVisibility: RareCollectibleVisibility;
  status: RareCollectibleStatus;
  story?: string | null;
  tags: string[];
  updatedAt: string;
  variantId?: string | null;
  verificationUrl?: string | null;
  authenticityNotes?: string | null;
  whatsappUrl?: string | null;
};

type ProductRelation = {
  category_name?: string | null;
  created_at?: string | null;
  description?: string | null;
  external_catalog_code?: string | null;
  franchise_id?: string | null;
  funko_number?: string | null;
  id: string;
  main_image_url?: string | null;
  name: string;
  product_images?: ProductImageRow[] | null;
  product_type?: string | null;
  product_variants?: ProductVariantRow[] | null;
  slug: string;
  status?: string | null;
  subcategory_name?: string | null;
  updated_at?: string | null;
};

type ProductImageRow = {
  id: string;
  image_url: string;
  sort_order: number | null;
};

type ProductVariantRow = {
  id: string;
  market_price: number | string | null;
  sale_price: number | string;
  sku: string;
  special_label?: string | null;
  special_tags?: string[] | null;
  status: CreateProductVariantInput["status"];
};

type RareCollectibleRow = {
  allow_reservation: boolean;
  authentication_code?: string | null;
  authentication_image_url?: string | null;
  autograph_date?: string | null;
  autograph_location?: string | null;
  availability_message?: string | null;
  badge_label: string;
  category: string;
  certificate_image_url?: string | null;
  certificate_type?: string | null;
  certifier_name?: string | null;
  checkout_url?: string | null;
  collectible_year?: string | null;
  condition_notes?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  description?: string | null;
  display_order: number;
  edition?: string | null;
  id: string;
  included_items: string[] | null;
  installments_max: number;
  is_featured: boolean;
  is_public: boolean;
  packaging_image_url?: string | null;
  products?: ProductRelation | ProductRelation[] | null;
  product_id: string;
  public_visibility: RareCollectibleVisibility;
  purchase_mode: RareCollectiblePurchaseMode;
  quantity_available: number;
  reservation_days?: number | null;
  seo_description?: string | null;
  seo_title?: string | null;
  serial_image_url?: string | null;
  serial_number?: string | null;
  share_image_url?: string | null;
  short_title?: string | null;
  signer_name?: string | null;
  signer_role?: string | null;
  sold_visibility: RareCollectibleVisibility;
  status: RareCollectibleStatus;
  story?: string | null;
  tags: string[] | null;
  updated_at: string;
  variant_id?: string | null;
  verification_url?: string | null;
  authenticity_notes?: string | null;
  whatsapp_url?: string | null;
};

type RareCollectibleQueryError = {
  code?: string;
};

const rareCollectibleSelect = `
  id,product_id,variant_id,status,public_visibility,category,tags,short_title,story,signer_name,signer_role,
  autograph_date,autograph_location,serial_number,certifier_name,certificate_type,authentication_code,
  verification_url,authenticity_notes,included_items,condition_notes,collectible_year,edition,quantity_available,
  installments_max,purchase_mode,checkout_url,whatsapp_url,allow_reservation,reservation_days,
  availability_message,is_public,is_featured,display_order,badge_label,sold_visibility,cover_image_url,
  serial_image_url,certificate_image_url,authentication_image_url,packaging_image_url,seo_title,
  seo_description,share_image_url,created_at,updated_at,
  products!inner(
    id,name,slug,franchise_id,product_type,funko_number,description,main_image_url,status,
    category_name,subcategory_name,external_catalog_code,created_at,updated_at,
    product_images(id,image_url,sort_order),
    product_variants(id,sku,sale_price,market_price,status,special_label,special_tags)
  )
`;

const legacyRareProductSelect = `
  id,name,slug,franchise_id,product_type,funko_number,description,main_image_url,status,
  category_name,subcategory_name,external_catalog_code,created_at,updated_at,
  product_images(id,image_url,sort_order),
  product_variants(id,sku,sale_price,market_price,status,special_label,special_tags)
`;

function firstRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSku(name: string) {
  const prefix = slugify(name)
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 4))
    .join("-")
    .toUpperCase();

  return `RARO-${prefix || "PECA"}-${Date.now().toString(36).toUpperCase()}`;
}

function variantStatusFromRare(status: RareCollectibleStatus): CreateProductVariantInput["status"] {
  if (status === "sold") {
    return "sold_out";
  }

  if (status === "draft" || status === "archived") {
    return "hidden";
  }

  return "available";
}

function publicProductStatusFromRare(status: RareCollectibleStatus) {
  return status === "archived" ? "archived" : "active";
}

function normalizeDate(value?: string | null) {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  return null;
}

function normalizeSearch(value: string | null | undefined) {
  return slugify(value ?? "");
}

function rowMatchesQuery(item: RareCollectible, query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeSearch([
    item.name,
    item.shortTitle,
    item.signerName,
    item.category,
    item.serialNumber,
    item.authenticationCode,
    item.sku,
    item.tags.join(" "),
  ].filter(Boolean).join(" "));

  return haystack.includes(normalizedQuery);
}

function getSignerFromTags(tags: string[]) {
  const signerTag = tags.find((tag) => normalizeSearch(tag).startsWith("autografado-por-"));

  return signerTag?.replace(/^Autografado por\s+/i, "") ?? null;
}

function createRareTags(input: {
  authenticationCode?: string | null;
  authenticityNotes?: string | null;
  certificateType?: string | null;
  certifierName?: string | null;
  includedItems?: string[];
  isFeatured?: boolean;
  serialNumber?: string | null;
  signerName?: string | null;
  tags?: string[];
}) {
  const userTags = (input.tags ?? []).filter((tag) => {
    const normalized = normalizeSearch(tag);
    return normalized !== "destaque" && normalized !== "slideshow";
  });

  return Array.from(
    new Set([
      "Acervo Raro",
      "Autenticidade certificada",
      input.isFeatured ? "Slideshow" : null,
      input.authenticityNotes ? `Procedencia: ${input.authenticityNotes}` : null,
      input.certificateType ? `Certificado: ${input.certificateType}` : null,
      input.certifierName ? `Certificadora: ${input.certifierName}` : null,
      input.authenticationCode ? `Codigo de autenticacao: ${input.authenticationCode}` : null,
      input.serialNumber ? `Numero de serie: ${input.serialNumber}` : null,
      input.signerName ? `Autografado por ${input.signerName}` : null,
      ...(input.includedItems ?? []).map((includedItem) => `Inclui: ${includedItem}`),
      ...userTags,
    ].filter((tag): tag is string => Boolean(tag))),
  );
}

function normalizeTagPrefix(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getLegacyTagValue(tags: string[], prefix: string) {
  const normalizedPrefix = `${normalizeTagPrefix(prefix)}:`;
  const match = tags.find((tag) => normalizeTagPrefix(tag).startsWith(normalizedPrefix));

  if (!match) {
    return null;
  }

  const separatorIndex = match.indexOf(":");
  return separatorIndex >= 0 ? match.slice(separatorIndex + 1).trim() || null : null;
}

function getLegacyTagValues(tags: string[], prefix: string) {
  const normalizedPrefix = `${normalizeTagPrefix(prefix)}:`;

  return tags
    .filter((tag) => normalizeTagPrefix(tag).startsWith(normalizedPrefix))
    .map((tag) => {
      const separatorIndex = tag.indexOf(":");
      return separatorIndex >= 0 ? tag.slice(separatorIndex + 1).trim() : "";
    })
    .filter(Boolean);
}

function categoryMatches(item: RareCollectible, category: string | undefined) {
  if (!category || category === "todos") {
    return true;
  }

  if (category === "autografados") {
    return Boolean(item.signerName) || item.tags.some((tag) => normalizeSearch(tag).includes("autograf"));
  }

  if (category === "edicoes-limitadas") {
    return Boolean(item.edition) || item.tags.some((tag) => normalizeSearch(tag).includes("limit"));
  }

  const categorySlug = normalizeSearch(item.category);
  return categorySlug === category;
}

function sortRareCollectibles(items: RareCollectible[], sort: RareCollectibleFilter["sort"] = "featured") {
  return items.slice().sort((first, second) => {
    if (sort === "price_asc" && first.price !== second.price) {
      return first.price - second.price;
    }

    if (sort === "price_desc" && first.price !== second.price) {
      return second.price - first.price;
    }

    if (sort === "newest") {
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    }

    if (first.displayOrder !== second.displayOrder) {
      return first.displayOrder - second.displayOrder;
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

function isMissingRareCollectibleSchema(error: unknown) {
  const code = (error as RareCollectibleQueryError | null)?.code;
  return code === "PGRST200" || code === "PGRST205" || code === "42P01";
}

function getPrimaryVariant(row: RareCollectibleRow, product: ProductRelation) {
  const variants = product.product_variants ?? [];
  const byRareVariant = variants.find((variant) => variant.id === row.variant_id);

  return byRareVariant ?? variants[0] ?? null;
}

function getGalleryImages(product: ProductRelation) {
  return (product.product_images ?? [])
    .slice()
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    .map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      sortOrder: image.sort_order ?? 0,
    }));
}

function mapRareCollectible(row: RareCollectibleRow): RareCollectible {
  const product = firstRelation(row.products);

  if (!product) {
    throw notFound("Produto do Acervo Raro nao encontrado");
  }

  const variant = getPrimaryVariant(row, product);
  const galleryImages = getGalleryImages(product);
  const coverImageUrl = row.cover_image_url ?? product.main_image_url ?? galleryImages[0]?.imageUrl ?? null;
  const status = row.status;

  return {
    allowReservation: row.allow_reservation,
    authenticationCode: row.authentication_code ?? null,
    authenticationImageUrl: row.authentication_image_url ?? null,
    autographDate: row.autograph_date ?? null,
    autographLocation: row.autograph_location ?? null,
    availabilityMessage: row.availability_message ?? null,
    badgeLabel: row.badge_label,
    category: row.category,
    certificateImageUrl: row.certificate_image_url ?? null,
    certificateType: row.certificate_type ?? null,
    certifierName: row.certifier_name ?? null,
    checkoutUrl: row.checkout_url ?? null,
    collectibleYear: row.collectible_year ?? null,
    conditionNotes: row.condition_notes ?? null,
    coverImageUrl,
    createdAt: row.created_at,
    description: product.description ?? row.description ?? null,
    displayOrder: row.display_order,
    edition: row.edition ?? product.subcategory_name ?? null,
    franchiseId: product.franchise_id ?? null,
    funkoNumber: product.funko_number ?? null,
    galleryImages,
    id: row.id,
    includedItems: row.included_items ?? [],
    installmentsMax: row.installments_max,
    isFeatured: row.is_featured,
    isHistoric: status === "sold" && row.sold_visibility === "archive",
    isPublic: row.is_public,
    marketPrice: variant?.market_price ? Number(variant.market_price) : null,
    name: product.name,
    packagingImageUrl: row.packaging_image_url ?? null,
    price: Number(variant?.sale_price ?? 0),
    productId: row.product_id,
    productType: normalizeProductType(product.product_type),
    publicVisibility: row.public_visibility,
    purchaseMode: row.purchase_mode,
    quantityAvailable: row.quantity_available,
    reservationDays: row.reservation_days ?? null,
    seoDescription: row.seo_description ?? null,
    seoTitle: row.seo_title ?? null,
    serialImageUrl: row.serial_image_url ?? null,
    serialNumber: row.serial_number ?? null,
    shareImageUrl: row.share_image_url ?? null,
    shortTitle: row.short_title ?? null,
    signerName: row.signer_name ?? null,
    signerRole: row.signer_role ?? null,
    sku: variant?.sku ?? product.external_catalog_code ?? "ACERVO-RARO",
    slug: product.slug,
    soldVisibility: row.sold_visibility,
    status,
    story: row.story ?? null,
    tags: row.tags ?? [],
    updatedAt: row.updated_at,
    variantId: row.variant_id,
    verificationUrl: row.verification_url ?? null,
    authenticityNotes: row.authenticity_notes ?? null,
    whatsappUrl: row.whatsapp_url ?? null,
  };
}

function isLegacyRareProduct(product: ProductRelation) {
  return (product.product_variants ?? []).some((variant) => {
    const tags = (variant.special_tags ?? []).map(normalizeSearch);
    return tags.includes("acervo-raro");
  });
}

function legacyStatus(product: ProductRelation, variant: ProductVariantRow | null): RareCollectibleStatus {
  if (product.status === "archived") {
    return "archived";
  }

  if (variant?.status === "hidden") {
    return "draft";
  }

  if (variant?.status === "sold_out") {
    return "sold";
  }

  return "available";
}

function mapLegacyProductToRareCollectible(product: ProductRelation): RareCollectible {
  const variant =
    (product.product_variants ?? []).find((candidate) =>
      (candidate.special_tags ?? []).map(normalizeSearch).includes("acervo-raro"),
    ) ??
    (product.product_variants ?? [])[0] ??
    null;
  const tags = variant?.special_tags ?? [];
  const galleryImages = getGalleryImages(product);
  const status = legacyStatus(product, variant);
  const includedItems = getLegacyTagValues(tags, "Inclui");
  const authenticityNotes = getLegacyTagValue(tags, "Procedencia");

  return {
    allowReservation: false,
    authenticationCode: null,
    authenticationImageUrl: null,
    autographDate: null,
    autographLocation: null,
    availabilityMessage: null,
    badgeLabel: variant?.special_label ?? "Autenticidade certificada",
    category: product.category_name ?? "Cultura Pop",
    certificateImageUrl: null,
    certificateType: getLegacyTagValue(tags, "Certificado"),
    certifierName: getLegacyTagValue(tags, "Certificadora"),
    checkoutUrl: null,
    collectibleYear: null,
    conditionNotes: null,
    coverImageUrl: product.main_image_url ?? galleryImages[0]?.imageUrl ?? null,
    createdAt: product.created_at ?? new Date().toISOString(),
    description: product.description ?? null,
    displayOrder: 0,
    edition: product.subcategory_name ?? null,
    franchiseId: product.franchise_id ?? null,
    funkoNumber: product.funko_number ?? null,
    galleryImages,
    id: product.id,
    includedItems,
    installmentsMax: 10,
    isFeatured: tags.map(normalizeSearch).some((tag) => tag === "slideshow" || tag === "destaque"),
    isHistoric: false,
    isPublic: product.status !== "archived",
    marketPrice: variant?.market_price ? Number(variant.market_price) : null,
    name: product.name,
    packagingImageUrl: null,
    price: Number(variant?.sale_price ?? 0),
    productId: product.id,
    productType: normalizeProductType(product.product_type),
    publicVisibility: product.status === "archived" ? "hidden" : "visible",
    purchaseMode: "whatsapp",
    quantityAvailable: status === "sold" ? 0 : 1,
    reservationDays: null,
    seoDescription: null,
    seoTitle: null,
    serialImageUrl: null,
    serialNumber: getLegacyTagValue(tags, "Numero de serie"),
    shareImageUrl: null,
    shortTitle: null,
    signerName: getSignerFromTags(tags),
    signerRole: null,
    sku: variant?.sku ?? product.external_catalog_code ?? "ACERVO-RARO",
    slug: product.slug,
    soldVisibility: "visible",
    status,
    story: null,
    tags,
    updatedAt: product.updated_at ?? product.created_at ?? new Date().toISOString(),
    variantId: variant?.id ?? null,
    verificationUrl: null,
    authenticityNotes: authenticityNotes ?? (tags.map(normalizeSearch).includes("autenticidade-certificada")
      ? "Autenticidade e procedência informadas pela Smart Funkos."
      : null),
    whatsappUrl: null,
  };
}

function toRarePatch(input: UpdateRareCollectibleInput | CreateRareCollectibleInput, actorId?: string) {
  return {
    allow_reservation: input.allowReservation,
    authentication_code: input.authenticationCode,
    authentication_image_url: input.authenticationImageUrl,
    autograph_date: normalizeDate(input.autographDate),
    autograph_location: input.autographLocation,
    availability_message: input.availabilityMessage,
    badge_label: input.badgeLabel,
    category: input.category,
    certificate_image_url: input.certificateImageUrl,
    certificate_type: input.certificateType,
    certifier_name: input.certifierName,
    checkout_url: input.checkoutUrl,
    collectible_year: input.collectibleYear,
    condition_notes: input.conditionNotes,
    cover_image_url: input.coverImageUrl,
    display_order: input.displayOrder,
    edition: input.edition,
    included_items: input.includedItems,
    installments_max: input.installmentsMax,
    is_featured: input.isFeatured,
    is_public: input.isPublic,
    packaging_image_url: input.packagingImageUrl,
    public_visibility: input.publicVisibility,
    purchase_mode: input.purchaseMode,
    quantity_available: input.quantityAvailable,
    reservation_days: input.allowReservation === false ? null : input.reservationDays,
    seo_description: input.seoDescription,
    seo_title: input.seoTitle,
    serial_image_url: input.serialImageUrl,
    serial_number: input.serialNumber,
    share_image_url: input.shareImageUrl,
    short_title: input.shortTitle,
    signer_name: input.signerName,
    signer_role: input.signerRole,
    sold_visibility: input.soldVisibility,
    status: input.status,
    story: input.story,
    tags: input.tags,
    updated_by: actorId,
    verification_url: input.verificationUrl,
    authenticity_notes: input.authenticityNotes,
    whatsapp_url: input.whatsappUrl,
  };
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export class RareCollectibleService {
  private readonly audit: AuditLogService;
  private readonly productService: ProductService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
    this.productService = new ProductService(this.supabase, actorId);
  }

  private async createUniqueProductSlug(name: string, preferredSlug?: string | null) {
    const baseSlug = slugify(preferredSlug || name) || "acervo-raro";

    for (let index = 0; index < 25; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const { data, error } = await this.supabase
        .from("products")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao validar slug do Acervo Raro");
      }

      if (!data) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private async assertUniqueMetadata(input: {
    authenticationCode?: string | null;
    serialNumber?: string | null;
    ignoreId?: string;
  }) {
    const checks = [
      { column: "serial_number", label: "Numero de serie", value: input.serialNumber },
      { column: "authentication_code", label: "Codigo de autenticacao", value: input.authenticationCode },
    ];

    for (const check of checks) {
      const value = check.value?.trim();

      if (!value) {
        continue;
      }

      let query = this.supabase
        .from("rare_collectibles")
        .select("id")
        .ilike(check.column, value)
        .limit(1);

      if (input.ignoreId) {
        query = query.neq("id", input.ignoreId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        if (isMissingRareCollectibleSchema(error)) {
          return;
        }

        throwQueryError(error, `Falha ao validar ${check.label.toLowerCase()}`);
      }

      if (data) {
        throw conflict(`${check.label} ja cadastrado no Acervo Raro`);
      }
    }
  }

  private assertPublishable(input: {
    coverImageUrl?: string | null;
    description?: string | null;
    price: number;
    productMainImageUrl?: string | null;
    status: RareCollectibleStatus;
  }) {
    if (input.status === "draft" || input.status === "archived") {
      return;
    }

    if (input.price <= 0) {
      throw badRequest("Preco deve ser maior que zero para publicar a peca");
    }

    if (!input.description?.trim()) {
      throw badRequest("Descricao obrigatoria para publicar a peca");
    }

    if (!input.coverImageUrl?.trim() && !input.productMainImageUrl?.trim()) {
      throw badRequest("Imagem principal obrigatoria para publicar a peca");
    }
  }

  private async insertStatusHistory(rareCollectibleId: string, oldStatus: string | null, newStatus: string) {
    const { error } = await this.supabase.from("rare_collectible_status_history").insert({
      changed_by: this.actorId,
      new_status: newStatus,
      old_status: oldStatus,
      rare_collectible_id: rareCollectibleId,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar historico de status");
    }
  }

  private async insertPriceHistory(rareCollectibleId: string, oldPrice: number | null, newPrice: number) {
    const { error } = await this.supabase.from("rare_collectible_price_history").insert({
      changed_by: this.actorId,
      new_price: newPrice,
      old_price: oldPrice,
      rare_collectible_id: rareCollectibleId,
    });

    if (error) {
      throwQueryError(error, "Falha ao registrar historico de preco");
    }
  }

  private async listLegacyRareCollectibles() {
    const { data, error } = await this.supabase
      .from("products")
      .select(legacyRareProductSelect)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      throwQueryError(error, "Falha ao listar Acervo Raro legado");
    }

    return ((data ?? []) as unknown as ProductRelation[])
      .filter(isLegacyRareProduct)
      .map(mapLegacyProductToRareCollectible);
  }

  private async getLegacyRareCollectibleById(id: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(legacyRareProductSelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar Acervo Raro legado");
    }

    if (!data || !isLegacyRareProduct(data as unknown as ProductRelation)) {
      throw notFound("Peca do Acervo Raro nao encontrada");
    }

    return mapLegacyProductToRareCollectible(data as unknown as ProductRelation);
  }

  private async getLegacyRareCollectibleBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(legacyRareProductSelect)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar Acervo Raro legado");
    }

    if (!data || !isLegacyRareProduct(data as unknown as ProductRelation)) {
      return null;
    }

    return mapLegacyProductToRareCollectible(data as unknown as ProductRelation);
  }

  async listAdminRareCollectibles(filters: RareCollectibleFilter = {}) {
    const { data, error } = await this.supabase
      .from("rare_collectibles")
      .select(rareCollectibleSelect)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        const legacyItems = await this.listLegacyRareCollectibles();
        const filteredLegacy = legacyItems.filter((item) => {
          const status = filters.status && filters.status !== "all" ? item.status === filters.status : true;
          return status && categoryMatches(item, filters.category) && rowMatchesQuery(item, filters.query ?? "");
        });

        return sortRareCollectibles(filteredLegacy, filters.sort);
      }

      throwQueryError(error, "Falha ao listar Acervo Raro");
    }

    const mapped = ((data ?? []) as unknown as RareCollectibleRow[]).map(mapRareCollectible);
    const filtered = mapped.filter((item) => {
      const status = filters.status && filters.status !== "all" ? item.status === filters.status : true;
      return status && categoryMatches(item, filters.category) && rowMatchesQuery(item, filters.query ?? "");
    });

    return sortRareCollectibles(filtered, filters.sort);
  }

  async listPublicRareCollectibles(filters: RareCollectibleFilter = {}) {
    const { data, error } = await this.supabase
      .from("rare_collectibles")
      .select(rareCollectibleSelect)
      .eq("is_public", true)
      .neq("public_visibility", "hidden")
      .in("status", ["available", "reserved", "sold"])
      .eq("products.status", "active")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        const legacyItems = await this.listLegacyRareCollectibles();
        const mapped = legacyItems
          .filter((item) => item.isPublic)
          .filter((item) => {
            const status = filters.status && filters.status !== "all" ? item.status === filters.status : true;
            return status && categoryMatches(item, filters.category) && rowMatchesQuery(item, filters.query ?? "");
          });

        return {
          active: sortRareCollectibles(mapped, filters.sort),
          archive: [],
          all: sortRareCollectibles(mapped, filters.sort),
        };
      }

      throwQueryError(error, "Falha ao listar Acervo Raro publico");
    }

    const mapped = ((data ?? []) as unknown as RareCollectibleRow[])
      .map(mapRareCollectible)
      .filter((item) => !(item.status === "sold" && item.soldVisibility === "hidden"))
      .filter((item) => {
        const status = filters.status && filters.status !== "all" ? item.status === filters.status : true;
        return status && categoryMatches(item, filters.category) && rowMatchesQuery(item, filters.query ?? "");
      });
    const active = mapped.filter((item) => !item.isHistoric);
    const archive = mapped.filter((item) => item.isHistoric);

    return {
      active: sortRareCollectibles(active, filters.sort),
      archive: sortRareCollectibles(archive, filters.sort),
      all: sortRareCollectibles(mapped, filters.sort),
    };
  }

  async getPublicRareCollectibleBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("rare_collectibles")
      .select(rareCollectibleSelect)
      .eq("products.slug", slug)
      .eq("products.status", "active")
      .eq("is_public", true)
      .neq("public_visibility", "hidden")
      .in("status", ["available", "reserved", "sold"])
      .maybeSingle();

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        return this.getLegacyRareCollectibleBySlug(slug);
      }

      throwQueryError(error, "Falha ao buscar peca do Acervo Raro");
    }

    if (!data) {
      return null;
    }

    const item = mapRareCollectible(data as unknown as RareCollectibleRow);

    if (item.status === "sold" && item.soldVisibility === "hidden") {
      return null;
    }

    return item;
  }

  async getAdminRareCollectibleById(id: string) {
    const byRareId = await this.supabase
      .from("rare_collectibles")
      .select(rareCollectibleSelect)
      .eq("id", id)
      .maybeSingle();

    if (byRareId.error) {
      if (isMissingRareCollectibleSchema(byRareId.error)) {
        return this.getLegacyRareCollectibleById(id);
      }

      throwQueryError(byRareId.error, "Falha ao buscar Acervo Raro");
    }

    if (byRareId.data) {
      return mapRareCollectible(byRareId.data as unknown as RareCollectibleRow);
    }

    const byProductId = await this.supabase
      .from("rare_collectibles")
      .select(rareCollectibleSelect)
      .eq("product_id", id)
      .maybeSingle();

    if (byProductId.error) {
      if (isMissingRareCollectibleSchema(byProductId.error)) {
        return this.getLegacyRareCollectibleById(id);
      }

      throwQueryError(byProductId.error, "Falha ao buscar Acervo Raro");
    }

    if (!byProductId.data) {
      throw notFound("Peca do Acervo Raro nao encontrada");
    }

    return mapRareCollectible(byProductId.data as unknown as RareCollectibleRow);
  }

  async createRareCollectible(input: CreateRareCollectibleInput) {
    await this.assertUniqueMetadata(input);
    this.assertPublishable({
      coverImageUrl: input.coverImageUrl,
      description: input.description,
      price: input.salePrice,
      status: input.status,
    });

    const slug = await this.createUniqueProductSlug(input.name, input.slug);
    const sku = input.sku?.trim() || createSku(input.name);
    const product = await this.productService.createProduct({
      categoryName: input.category,
      description: input.description ?? input.story ?? null,
      externalCatalogCode: input.authenticationCode ?? input.serialNumber ?? sku,
      franchiseId: input.franchiseId ?? null,
      funkoNumber: input.funkoNumber ?? null,
      mainImageUrl: input.coverImageUrl ?? null,
      name: input.name,
      productType: input.productType ?? "funko_pop",
      slug,
      status: publicProductStatusFromRare(input.status),
      subcategoryName: input.edition ?? null,
      supplierId: null,
    });
    const productRow = product as unknown as { id: string; main_image_url: string | null };
    const variant = await this.productService.createVariant({
      condition: "new",
      estimatedCost: null,
      marketPrice: input.marketPrice ?? null,
      productId: productRow.id,
      salePrice: input.salePrice,
      sku,
      source: "own_stock",
      specialLabel: input.badgeLabel,
      specialTags: createRareTags(input),
      status: variantStatusFromRare(input.status),
      type: "special",
    });
    const variantRow = variant as unknown as { id: string };
    const rarePatch = toRarePatch(input, this.actorId);

    const { data, error } = await this.supabase
      .from("rare_collectibles")
      .insert({
        ...withoutUndefined(rarePatch),
        created_by: this.actorId,
        product_id: productRow.id,
        variant_id: variantRow.id,
      })
      .select(rareCollectibleSelect)
      .single();

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        const legacyItem = await this.getLegacyRareCollectibleById(productRow.id);
        await this.audit.createAdminActionLog({
          action: "rare_collectible.create_legacy",
          adminId: this.actorId,
          entityId: legacyItem.id,
          entityType: "product",
          newValue: legacyItem,
        });
        revalidateTag("catalog-products", "max");
        revalidateTag("catalog-options", "max");
        revalidateTag("rare-collectibles", "max");

        return legacyItem;
      }

      throwQueryError(error, "Falha ao criar Acervo Raro");
    }

    const created = mapRareCollectible(data as unknown as RareCollectibleRow);
    await Promise.all([
      this.insertStatusHistory(created.id, null, input.status),
      this.insertPriceHistory(created.id, null, input.salePrice),
      this.audit.createAdminActionLog({
        action: "rare_collectible.create",
        adminId: this.actorId,
        entityId: created.id,
        entityType: "rare_collectible",
        newValue: created,
      }),
    ]);
    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");
    revalidateTag("rare-collectibles", "max");

    return created;
  }

  async updateRareCollectible(id: string, input: UpdateRareCollectibleInput) {
    await this.assertUniqueMetadata({
      authenticationCode: input.authenticationCode,
      ignoreId: id,
      serialNumber: input.serialNumber,
    });

    const current = await this.getAdminRareCollectibleById(id);
    const nextStatus = input.status ?? current.status;
    const nextPrice = input.salePrice ?? current.price;
    const nextDescription = input.description ?? current.description ?? null;
    const nextCoverImageUrl = input.coverImageUrl ?? current.coverImageUrl ?? null;

    this.assertPublishable({
      coverImageUrl: nextCoverImageUrl,
      description: nextDescription,
      price: nextPrice,
      productMainImageUrl: current.coverImageUrl,
      status: nextStatus,
    });

    await this.productService.updateProduct(current.productId, {
      categoryName: input.category,
      description: input.description,
      externalCatalogCode: input.authenticationCode ?? input.serialNumber ?? undefined,
      franchiseId: input.franchiseId,
      funkoNumber: input.funkoNumber,
      mainImageUrl: input.coverImageUrl,
      name: input.name,
      productType: input.productType,
      slug: input.slug,
      status: input.status ? publicProductStatusFromRare(input.status) : undefined,
      subcategoryName: input.edition,
      supplierId: null,
    });

    if (current.variantId) {
      const shouldUpdateRareTags =
        input.authenticationCode !== undefined ||
        input.authenticityNotes !== undefined ||
        input.certificateType !== undefined ||
        input.certifierName !== undefined ||
        input.includedItems !== undefined ||
        input.isFeatured !== undefined ||
        input.serialNumber !== undefined ||
        input.signerName !== undefined ||
        input.tags !== undefined;
      const variantPatch: UpdateProductVariantInput = {
        marketPrice: input.marketPrice,
        salePrice: input.salePrice,
        sku: input.sku ?? undefined,
        specialLabel: input.badgeLabel,
        specialTags: shouldUpdateRareTags
          ? createRareTags({
              authenticationCode: input.authenticationCode ?? current.authenticationCode,
              authenticityNotes: input.authenticityNotes ?? current.authenticityNotes,
              certificateType: input.certificateType ?? current.certificateType,
              certifierName: input.certifierName ?? current.certifierName,
              includedItems: input.includedItems ?? current.includedItems,
              isFeatured: input.isFeatured ?? current.isFeatured,
              serialNumber: input.serialNumber ?? current.serialNumber,
              signerName: input.signerName ?? current.signerName,
              tags: input.tags ?? current.tags,
            })
          : undefined,
        status: input.status ? variantStatusFromRare(input.status) : undefined,
        type: "special",
      };

      await this.productService.updateProductVariant(current.variantId, variantPatch);
    }

    const rarePatch = withoutUndefined(toRarePatch(input, this.actorId));
    const { data, error } = await this.supabase
      .from("rare_collectibles")
      .update(rarePatch)
      .eq("id", current.id)
      .select(rareCollectibleSelect)
      .single();

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        const updatedLegacy = await this.getLegacyRareCollectibleById(current.productId);
        await this.audit.createAdminActionLog({
          action: "rare_collectible.update_legacy",
          adminId: this.actorId,
          entityId: updatedLegacy.id,
          entityType: "product",
          newValue: updatedLegacy,
          oldValue: current,
        });
        revalidateTag("catalog-products", "max");
        revalidateTag("catalog-options", "max");
        revalidateTag("rare-collectibles", "max");

        return updatedLegacy;
      }

      throwQueryError(error, "Falha ao atualizar Acervo Raro");
    }

    const updated = mapRareCollectible(data as unknown as RareCollectibleRow);
    const historyTasks: Array<Promise<unknown>> = [
      this.audit.createAdminActionLog({
        action: "rare_collectible.update",
        adminId: this.actorId,
        entityId: updated.id,
        entityType: "rare_collectible",
        newValue: updated,
        oldValue: current,
      }),
    ];

    if (current.status !== updated.status) {
      historyTasks.push(this.insertStatusHistory(updated.id, current.status, updated.status));
    }

    if (current.price !== updated.price) {
      historyTasks.push(this.insertPriceHistory(updated.id, current.price, updated.price));
    }

    await Promise.all(historyTasks);
    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");
    revalidateTag("rare-collectibles", "max");

    return updated;
  }

  async duplicateRareCollectible(id: string) {
    const current = await this.getAdminRareCollectibleById(id);
    const duplicated = await this.createRareCollectible({
      allowReservation: current.allowReservation,
      authenticationCode: null,
      authenticationImageUrl: current.authenticationImageUrl ?? null,
      autographDate: current.autographDate ?? null,
      autographLocation: current.autographLocation ?? null,
      authenticityNotes: current.authenticityNotes ?? null,
      availabilityMessage: current.availabilityMessage ?? null,
      badgeLabel: current.badgeLabel,
      category: current.category,
      certificateImageUrl: current.certificateImageUrl ?? null,
      certificateType: current.certificateType ?? null,
      certifierName: current.certifierName ?? null,
      checkoutUrl: current.checkoutUrl ?? null,
      collectibleYear: current.collectibleYear ?? null,
      conditionNotes: current.conditionNotes ?? null,
      coverImageUrl: current.coverImageUrl ?? null,
      description: current.description ?? null,
      displayOrder: current.displayOrder + 1,
      edition: current.edition ?? null,
      franchiseId: current.franchiseId ?? null,
      funkoNumber: current.funkoNumber ?? null,
      includedItems: current.includedItems,
      installmentsMax: current.installmentsMax,
      isFeatured: false,
      isPublic: false,
      marketPrice: current.marketPrice ?? null,
      name: `${current.name} (copia)`,
      packagingImageUrl: current.packagingImageUrl ?? null,
      productType: normalizeProductType(current.productType),
      publicVisibility: "hidden",
      purchaseMode: current.purchaseMode,
      quantityAvailable: current.quantityAvailable,
      reservationDays: current.reservationDays ?? null,
      salePrice: current.price,
      seoDescription: current.seoDescription ?? null,
      seoTitle: current.seoTitle ?? null,
      serialImageUrl: current.serialImageUrl ?? null,
      serialNumber: null,
      shareImageUrl: current.shareImageUrl ?? null,
      shortTitle: current.shortTitle ?? null,
      signerName: current.signerName ?? null,
      signerRole: current.signerRole ?? null,
      sku: null,
      slug: undefined,
      soldVisibility: current.soldVisibility,
      status: "draft",
      story: current.story ?? null,
      tags: current.tags,
      verificationUrl: current.verificationUrl ?? null,
      whatsappUrl: current.whatsappUrl ?? null,
    });

    await this.audit.createAdminActionLog({
      action: "rare_collectible.duplicate",
      adminId: this.actorId,
      entityId: duplicated.id,
      entityType: "rare_collectible",
      newValue: { duplicatedFrom: current.id, duplicated },
    });

    return duplicated;
  }

  async archiveRareCollectible(id: string) {
    return this.updateRareCollectible(id, {
      isPublic: false,
      publicVisibility: "hidden",
      status: "archived",
    });
  }

  async deleteRareCollectible(id: string) {
    const current = await this.getAdminRareCollectibleById(id);

    await this.productService.updateProduct(current.productId, {
      status: "archived",
    });

    const { error } = await this.supabase
      .from("rare_collectibles")
      .delete()
      .eq("id", current.id);

    if (error) {
      if (isMissingRareCollectibleSchema(error)) {
        if (current.variantId) {
          await this.productService.updateProductVariant(current.variantId, {
            specialLabel: null,
            specialTags: [],
            status: "hidden",
            type: "common",
          });
        }

        await this.audit.createAdminActionLog({
          action: "rare_collectible.delete_legacy",
          adminId: this.actorId,
          entityId: current.id,
          entityType: "product",
          oldValue: current,
        });
        revalidateTag("catalog-products", "max");
        revalidateTag("catalog-options", "max");
        revalidateTag("rare-collectibles", "max");

        return current;
      }

      throwQueryError(error, "Falha ao excluir peca do Acervo Raro");
    }

    await this.audit.createAdminActionLog({
      action: "rare_collectible.delete",
      adminId: this.actorId,
      entityId: current.id,
      entityType: "rare_collectible",
      oldValue: current,
    });
    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");
    revalidateTag("rare-collectibles", "max");

    return current;
  }
}

export function getRareCollectibleStatusLabel(status: RareCollectibleStatus) {
  const labels: Record<RareCollectibleStatus, string> = {
    archived: "Arquivado",
    available: "Disponivel",
    draft: "Rascunho",
    reserved: "Reservado",
    sold: "Vendido",
  };

  return labels[status];
}

export function getRareCollectibleInstallmentText(item: Pick<RareCollectible, "installmentsMax" | "price">) {
  const installments = Math.max(1, item.installmentsMax || 1);
  return `${installments}x de ${formatCurrency(item.price / installments)}`;
}
