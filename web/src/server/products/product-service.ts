import "server-only";
import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const productStatusSchema = z.enum(["active", "inactive", "archived"]);

export const createProductSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).optional(),
  franchiseId: z.string().uuid().optional().nullable(),
  funkoNumber: z.string().trim().optional().nullable(),
  categoryName: z.string().trim().optional().nullable(),
  subcategoryName: z.string().trim().optional().nullable(),
  externalCatalogCode: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  mainImageUrl: z.string().url().optional().nullable(),
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
  specialLabel: z.string().trim().optional().nullable(),
  specialTags: z.array(z.string().trim().min(1)).optional().default([]),
  status: z.enum(["available", "order_only", "preorder", "sold_out", "hidden"]).default("available"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;

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

export type ProductVariantSearchResult = {
  id: string;
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

function productSelect() {
  return `
    id,name,slug,franchise_id,funko_number,description,main_image_url,status,created_at,updated_at,
    category_name,subcategory_name,external_catalog_code,
    franchises(id,name,slug),
    product_variants(id,sku,condition,type,source,sale_price,market_price,estimated_cost,special_label,special_tags,status,created_at,updated_at)
  `;
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
    const patch = {
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
    };

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

  async listVariants(productId: string) {
    const { data, error } = await this.supabase
      .from("product_variants")
      .select("id,product_id,sku,condition,type,source,sale_price,market_price,estimated_cost,special_label,special_tags,status,created_at,updated_at")
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
      .select("id,product_id,sku,condition,type,source,sale_price,market_price,estimated_cost,special_label,special_tags,status,created_at,updated_at")
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
}
