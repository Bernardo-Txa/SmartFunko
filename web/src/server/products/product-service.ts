import "server-only";
import { z } from "zod";
import { badRequest, conflict, notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const productStatusSchema = z.enum(["active", "inactive", "archived"]);

function nullableTrimmedText() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().nullable().optional(),
  );
}

function optionalTrimmedText(min = 1) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().min(min).optional(),
  );
}

const nullableUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().url().nullable().optional(),
);

const specialTagsSchema = z.preprocess(
  (value) => {
    const rawTags = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[|,]/)
        : [];

    return rawTags
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  },
  z.array(z.string()).default([]),
).transform((tags) => Array.from(new Set(tags)));

const optionalSpecialTagsSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    const rawTags = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[|,]/)
        : [];

    return rawTags
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  },
  z.array(z.string()).optional(),
).transform((tags) => (tags ? Array.from(new Set(tags)) : undefined));

export const createProductSchema = z.object({
  name: z.string().trim().min(2),
  slug: optionalTrimmedText(2),
  franchiseId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  funkoNumber: nullableTrimmedText(),
  categoryName: nullableTrimmedText(),
  subcategoryName: nullableTrimmedText(),
  externalCatalogCode: nullableTrimmedText(),
  description: nullableTrimmedText(),
  mainImageUrl: nullableUrlSchema,
  status: productStatusSchema.default("active"),
});

export const updateProductSchema = createProductSchema.partial();

export const createProductVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().trim().min(2),
  condition: z.enum(["new", "used", "damaged_box"]).default("new"),
  type: z.enum(["common", "exclusive", "chase", "glow", "special"]).default("common"),
  source: z.enum(["own_stock", "national", "international", "preorder"]).default("own_stock"),
  salePrice: z.number().nonnegative(),
  marketPrice: z.number().nonnegative().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  specialLabel: nullableTrimmedText(),
  specialTags: specialTagsSchema,
  status: z.enum(["available", "order_only", "preorder", "sold_out", "hidden"]).default("available"),
});

export const updateProductVariantSchema = z.object({
  condition: z.enum(["new", "used", "damaged_box"]).optional(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  marketPrice: z.number().nonnegative().optional().nullable(),
  salePrice: z.number().nonnegative().optional(),
  sku: z.string().trim().min(2).optional(),
  source: z.enum(["own_stock", "national", "international", "preorder"]).optional(),
  specialLabel: nullableTrimmedText(),
  specialTags: optionalSpecialTagsSchema,
  status: z.enum(["available", "order_only", "preorder", "sold_out", "hidden"]).optional(),
  type: z.enum(["common", "exclusive", "chase", "glow", "special"]).optional(),
});

export const quickCreateProductSchema = z.object({
  category: nullableTrimmedText(),
  franchise: nullableTrimmedText(),
  imageUrl: nullableUrlSchema,
  name: z.string().trim().min(2),
  notes: nullableTrimmedText(),
  salePrice: z.number().positive(),
  sku: nullableTrimmedText(),
  subcategory: nullableTrimmedText(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type QuickCreateProductInput = z.infer<typeof quickCreateProductSchema>;

type EntityWithId = {
  id: string;
};

type ProductRelation = {
  id: string;
  name: string;
  slug: string;
};

type VariantSearchRow = {
  id: string;
  product_id: string;
  sku: string;
  source: CreateProductVariantInput["source"];
  sale_price: number;
  status: CreateProductVariantInput["status"];
  products?: ProductRelation | ProductRelation[] | null;
};

type ProductSearchRow = {
  id: string;
  name: string;
  slug: string;
  product_variants?: Array<{
    id: string;
    sku: string;
    source: CreateProductVariantInput["source"];
    sale_price: number;
    status: CreateProductVariantInput["status"];
  }> | null;
};

export type ProductImageRow = {
  created_at: string;
  id: string;
  image_url: string;
  product_id: string;
  sort_order: number;
};

type ProductMainImageRow = {
  id: string;
  main_image_url: string | null;
};

export type ProductVariantSearchResult = {
  id: string;
  isNew?: boolean;
  productId: string;
  productName: string;
  productSlug: string;
  salePrice: number;
  sku: string;
  source: CreateProductVariantInput["source"];
  status: CreateProductVariantInput["status"];
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createQuickSku(name: string) {
  const prefix = slugify(name)
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 4))
    .join("-")
    .toUpperCase();

  return `SFQ-${prefix || "PROD"}-${Date.now().toString(36).toUpperCase()}`;
}

function productSelect() {
  return `
    id,name,slug,franchise_id,supplier_id,funko_number,description,main_image_url,status,created_at,updated_at,
    category_name,subcategory_name,external_catalog_code,
    franchises(id,name,slug),
    suppliers(id,name,slug),
    product_images(id,product_id,image_url,sort_order,created_at),
    product_variants(id,sku,condition,type,source,sale_price,market_price,estimated_cost,special_label,special_tags,status,created_at,updated_at)
  `;
}

function productImageSelect() {
  return "id,product_id,image_url,sort_order,created_at";
}

function variantSelect() {
  return "id,product_id,sku,condition,type,source,sale_price,market_price,estimated_cost,special_label,special_tags,status,created_at,updated_at";
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export class ProductService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listPublicProducts() {
    const { data, error } = await this.supabase
      .from("products")
      .select(productSelect())
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar produtos publicos");
    }

    return data ?? [];
  }

  async listAdminProducts(options: { limit?: number; page?: number; search?: string } = {}) {
    const limit = Math.min(500, Math.max(1, options.limit ?? 150));
    const page = Math.max(1, options.page ?? 1);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from("products")
      .select(productSelect())
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.search?.trim()) {
      const search = options.search.trim().replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,external_catalog_code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar produtos");
    }

    return data ?? [];
  }

  async listProductsBySupplierId(supplierId: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(productSelect())
      .eq("supplier_id", supplierId)
      .order("name", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar produtos por fornecedor");
    }

    return data ?? [];
  }

  async listFranchiseOptions() {
    const { data, error } = await this.supabase
      .from("franchises")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar franquias");
    }

    return data ?? [];
  }

  private async createUniqueSlug(table: "franchises" | "products", base: string) {
    const fallback = table === "franchises" ? "franquia" : "produto";
    const baseSlug = slugify(base) || fallback;

    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const { data, error } = await this.supabase
        .from(table)
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();

      if (error) {
        throwQueryError(error, "Falha ao validar slug");
      }

      if (!data) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private async resolveFranchiseId(franchiseName?: string | null) {
    const name = franchiseName?.trim();

    if (!name) {
      return null;
    }

    const { data: existing, error: existingError } = await this.supabase
      .from("franchises")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throwQueryError(existingError, "Falha ao buscar franquia");
    }

    if (existing) {
      return existing.id as string;
    }

    const slug = await this.createUniqueSlug("franchises", name);
    const { data, error } = await this.supabase
      .from("franchises")
      .insert({
        name,
        slug,
        status: "active",
      })
      .select("id,name,slug")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar franquia");
    }

    await this.audit.createAdminActionLog({
      action: "franchise.quick_create",
      adminId: this.actorId,
      entityId: data.id,
      entityType: "franchise",
      newValue: data,
    });

    return data.id as string;
  }

  private async assertSkuAvailable(sku: string) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao validar SKU");
    }

    if (data) {
      throw conflict("SKU ja cadastrado");
    }
  }

  async quickCreateProduct(input: QuickCreateProductInput) {
    const sku = input.sku?.trim() || createQuickSku(input.name);
    await this.assertSkuAvailable(sku);

    const [franchiseId, slug] = await Promise.all([
      this.resolveFranchiseId(input.franchise),
      this.createUniqueSlug("products", input.name),
    ]);

    const product = await this.createProduct({
      categoryName: input.category ?? null,
      description: input.notes ?? null,
      externalCatalogCode: sku,
      franchiseId,
      funkoNumber: null,
      mainImageUrl: input.imageUrl ?? null,
      name: input.name,
      slug,
      status: "active",
      subcategoryName: input.subcategory ?? null,
      supplierId: null,
    });
    const productId = (product as unknown as EntityWithId).id;
    const variant = await this.createVariant({
      condition: "new",
      estimatedCost: null,
      marketPrice: null,
      productId,
      salePrice: input.salePrice,
      sku,
      source: "national",
      specialLabel: "Criado no pedido",
      specialTags: ["quick-create"],
      status: "order_only",
      type: "common",
    });
    const productRow = product as unknown as {
      id: string;
      main_image_url: string | null;
      name: string;
      slug: string;
    };
    const variantRow = variant as unknown as {
      id: string;
      sale_price: number | string;
      sku: string;
      source: CreateProductVariantInput["source"];
      status: CreateProductVariantInput["status"];
    };

    await this.audit.createAdminActionLog({
      action: "product.quick_create",
      adminId: this.actorId,
      entityId: productId,
      entityType: "product",
      newValue: { product, variant },
    });

    return {
      product: {
        id: productRow.id,
        imageUrl: productRow.main_image_url,
        name: productRow.name,
        slug: productRow.slug,
      },
      searchOption: {
        id: variantRow.id,
        isNew: true,
        productId: productRow.id,
        productName: productRow.name,
        productSlug: productRow.slug,
        salePrice: Number(variantRow.sale_price),
        sku: variantRow.sku,
        source: variantRow.source,
        status: variantRow.status,
      } satisfies ProductVariantSearchResult,
      variant: {
        id: variantRow.id,
        salePrice: Number(variantRow.sale_price),
        sku: variantRow.sku,
      },
    };
  }

  async searchAdminProductVariants(options: { limit?: number; search: string }) {
    const search = options.search.trim();

    if (search.length < 2) {
      return [];
    }

    const limit = Math.min(30, Math.max(1, options.limit ?? 20));
    const productLimit = Math.min(12, limit);
    const safeSearch = escapeSearch(search);
    const productVariantSelect = "id,sku,source,sale_price,status";

    const [productResult, skuResult] = await Promise.all([
      this.supabase
        .from("products")
        .select(`id,name,slug,product_variants(${productVariantSelect})`)
        .eq("status", "active")
        .or(`name.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%,external_catalog_code.ilike.%${safeSearch}%`)
        .order("name", { ascending: true })
        .limit(productLimit),
      this.supabase
        .from("product_variants")
        .select(`id,product_id,sku,source,sale_price,status,products!inner(id,name,slug)`)
        .ilike("sku", `%${safeSearch}%`)
        .order("sku", { ascending: true })
        .limit(limit),
    ]);

    if (productResult.error) {
      throwQueryError(productResult.error, "Falha ao buscar produtos");
    }

    if (skuResult.error) {
      throwQueryError(skuResult.error, "Falha ao buscar variantes");
    }

    const results = new Map<string, ProductVariantSearchResult>();

    for (const product of (productResult.data ?? []) as unknown as ProductSearchRow[]) {
      for (const variant of product.product_variants ?? []) {
        if (variant.status === "hidden" || results.size >= limit) {
          continue;
        }

        results.set(variant.id, {
          id: variant.id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          salePrice: Number(variant.sale_price),
          sku: variant.sku,
          source: variant.source,
          status: variant.status,
        });
      }
    }

    for (const variant of (skuResult.data ?? []) as unknown as VariantSearchRow[]) {
      if (variant.status === "hidden" || results.has(variant.id) || results.size >= limit) {
        continue;
      }

      const product = firstRelation(variant.products);

      if (!product) {
        continue;
      }

      results.set(variant.id, {
        id: variant.id,
        productId: variant.product_id,
        productName: product.name,
        productSlug: product.slug,
        salePrice: Number(variant.sale_price),
        sku: variant.sku,
        source: variant.source,
        status: variant.status,
      });
    }

    return Array.from(results.values()).slice(0, limit);
  }

  async getProductById(id: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(productSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar produto");
    }

    if (!data) {
      throw notFound("Produto nao encontrado");
    }

    return data;
  }

  async getAdminProductById(id: string) {
    return this.getProductById(id);
  }

  async getProductBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(productSelect())
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar produto");
    }

    if (!data) {
      throw notFound("Produto nao encontrado");
    }

    return data;
  }

  async createProduct(input: CreateProductInput) {
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    const { data, error } = await this.supabase
      .from("products")
      .insert({
        category_name: input.categoryName ?? null,
        description: input.description ?? null,
        external_catalog_code: input.externalCatalogCode ?? null,
        franchise_id: input.franchiseId ?? null,
        funko_number: input.funkoNumber ?? null,
        main_image_url: input.mainImageUrl ?? null,
        name: input.name,
        slug,
        status: input.status,
        subcategory_name: input.subcategoryName ?? null,
        supplier_id: input.supplierId ?? null,
      })
      .select(productSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar produto");
    }

    const created = data as unknown as EntityWithId;

    await this.audit.createAdminActionLog({
      action: "product.create",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "product",
      newValue: data,
    });

    return data;
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    const current = await this.getProductById(id);
    const patch = withoutUndefined({
      description: input.description,
      category_name: input.categoryName,
      external_catalog_code: input.externalCatalogCode,
      franchise_id: input.franchiseId,
      funko_number: input.funkoNumber,
      main_image_url: input.mainImageUrl,
      name: input.name,
      slug: input.slug ? slugify(input.slug) : undefined,
      status: input.status,
      subcategory_name: input.subcategoryName,
      supplier_id: input.supplierId,
    });

    const { data, error } = await this.supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select(productSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar produto");
    }

    await this.audit.createAdminActionLog({
      action: "product.update",
      adminId: this.actorId,
      entityId: id,
      entityType: "product",
      newValue: data,
      oldValue: current,
    });

    return data;
  }

  async listProductImages(productId: string) {
    const { data, error } = await this.supabase
      .from("product_images")
      .select(productImageSelect())
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar imagens do produto");
    }

    return (data ?? []) as unknown as ProductImageRow[];
  }

  private async getProductImage(productId: string, imageId: string) {
    const { data, error } = await this.supabase
      .from("product_images")
      .select(productImageSelect())
      .eq("id", imageId)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar imagem do produto");
    }

    if (!data) {
      throw notFound("Imagem do produto nao encontrada");
    }

    return data as unknown as ProductImageRow;
  }

  async addProductImage(productId: string, imageUrl: string, sortOrder?: number) {
    await this.getProductById(productId);

    const nextSortOrder =
      sortOrder ??
      ((await this.listProductImages(productId)).reduce(
        (max, image) => Math.max(max, image.sort_order),
        -1,
      ) + 1);

    const { data, error } = await this.supabase
      .from("product_images")
      .insert({
        image_url: imageUrl,
        product_id: productId,
        sort_order: nextSortOrder,
      })
      .select(productImageSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao adicionar imagem do produto");
    }

    await this.audit.createAdminActionLog({
      action: "product_image.create",
      adminId: this.actorId,
      entityId: (data as unknown as ProductImageRow).id,
      entityType: "product_image",
      newValue: data,
    });

    return data as unknown as ProductImageRow;
  }

  async setMainProductImage(productId: string, imageId: string) {
    const [current, image] = await Promise.all([
      this.getProductById(productId),
      this.getProductImage(productId, imageId),
    ]);
    const currentProduct = current as unknown as ProductMainImageRow;

    const { data, error } = await this.supabase
      .from("products")
      .update({ main_image_url: image.image_url })
      .eq("id", productId)
      .select(productSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao definir imagem principal");
    }

    await this.audit.createAdminActionLog({
      action: "product_image.set_main",
      adminId: this.actorId,
      entityId: productId,
      entityType: "product",
      newValue: { image, main_image_url: image.image_url },
      oldValue: { main_image_url: currentProduct.main_image_url },
    });

    return data;
  }

  async deleteProductImage(productId: string, imageId: string) {
    const [current, image] = await Promise.all([
      this.getProductById(productId),
      this.getProductImage(productId, imageId),
    ]);
    const currentProduct = current as unknown as ProductMainImageRow;

    const { error } = await this.supabase
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .eq("product_id", productId);

    if (error) {
      throwQueryError(error, "Falha ao remover imagem do produto");
    }

    const images = await this.listProductImages(productId);
    let product = currentProduct;

    if (currentProduct.main_image_url === image.image_url) {
      const nextMainImageUrl = images[0]?.image_url ?? null;
      const updateResult = await this.supabase
        .from("products")
        .update({ main_image_url: nextMainImageUrl })
        .eq("id", productId)
        .select(productSelect())
        .single();

      if (updateResult.error) {
        throwQueryError(updateResult.error, "Falha ao atualizar imagem principal");
      }

      product = updateResult.data as unknown as ProductMainImageRow;
    }

    await this.audit.createAdminActionLog({
      action: "product_image.delete",
      adminId: this.actorId,
      entityId: imageId,
      entityType: "product_image",
      newValue: {
        main_image_url: product.main_image_url,
        remaining_images: images,
      },
      oldValue: image,
    });

    return {
      deletedImage: image,
      images,
      product,
    };
  }

  async reorderProductImages(productId: string, imageIdsInOrder: string[]) {
    await this.getProductById(productId);

    const uniqueIds = new Set(imageIdsInOrder);

    if (uniqueIds.size !== imageIdsInOrder.length) {
      throw badRequest("Ordem de imagens invalida");
    }

    const currentImages = await this.listProductImages(productId);
    const currentIds = new Set(currentImages.map((image) => image.id));
    const hasAllCurrentImages =
      imageIdsInOrder.length === currentImages.length &&
      imageIdsInOrder.every((imageId) => currentIds.has(imageId));

    if (!hasAllCurrentImages) {
      throw badRequest("Ordem de imagens invalida");
    }

    await Promise.all(
      imageIdsInOrder.map(async (imageId, index) => {
        const { error } = await this.supabase
          .from("product_images")
          .update({ sort_order: index })
          .eq("id", imageId)
          .eq("product_id", productId);

        if (error) {
          throwQueryError(error, "Falha ao reordenar imagens do produto");
        }
      }),
    );

    const images = await this.listProductImages(productId);

    await this.audit.createAdminActionLog({
      action: "product_image.reorder",
      adminId: this.actorId,
      entityId: productId,
      entityType: "product",
      newValue: images,
      oldValue: currentImages,
    });

    return images;
  }

  async listVariants(productId: string) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .select(variantSelect())
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar variantes");
    }

    return data ?? [];
  }

  async createVariant(input: CreateProductVariantInput) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .insert({
        condition: input.condition,
        estimated_cost: input.estimatedCost ?? null,
        market_price: input.marketPrice ?? null,
        product_id: input.productId,
        sale_price: input.salePrice,
        sku: input.sku,
        source: input.source,
        special_label: input.specialLabel ?? null,
        special_tags: input.specialTags ?? [],
        status: input.status,
        type: input.type,
      })
      .select(variantSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar variante");
    }

    const created = data as unknown as EntityWithId;

    await this.audit.createAdminActionLog({
      action: "product_variant.create",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "product_variant",
      newValue: data,
    });

    return data;
  }

  async getVariantById(id: string) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .select(variantSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar variante");
    }

    if (!data) {
      throw notFound("Variante nao encontrada");
    }

    return data;
  }

  async updateProductVariant(id: string, input: UpdateProductVariantInput) {
    const current = await this.getVariantById(id);
    const patch = withoutUndefined({
      condition: input.condition,
      estimated_cost: input.estimatedCost,
      market_price: input.marketPrice,
      sale_price: input.salePrice,
      sku: input.sku,
      source: input.source,
      special_label: input.specialLabel,
      special_tags: input.specialTags,
      status: input.status,
      type: input.type,
    });

    const { data, error } = await this.supabase
      .from("product_variants")
      .update(patch)
      .eq("id", id)
      .select(variantSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar variante");
    }

    await this.audit.createAdminActionLog({
      action: "product_variant.update",
      adminId: this.actorId,
      entityId: id,
      entityType: "product_variant",
      newValue: data,
      oldValue: current,
    });

    return data;
  }
}
