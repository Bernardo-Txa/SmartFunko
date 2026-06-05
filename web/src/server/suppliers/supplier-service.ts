import "server-only";
import { z } from "zod";
import { notFound } from "@/server/http/errors";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const supplierStatusSchema = z.enum(["active", "inactive", "hidden"]);

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

function isAbsoluteUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const nullableAssetUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z
    .string()
    .refine((value) => value.startsWith("/") || isAbsoluteUrl(value), {
      message: "Informe uma URL absoluta ou um caminho publico iniciado por /",
    })
    .nullable()
    .optional(),
);

export const createSupplierSchema = z.object({
  accentColor: nullableTrimmedText(),
  bannerUrl: nullableAssetUrlSchema,
  description: nullableTrimmedText(),
  logoUrl: nullableAssetUrlSchema,
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).optional(),
  sortOrder: z.number().int().default(0),
  status: supplierStatusSchema.default("active"),
  websiteUrl: nullableUrlSchema,
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export type SupplierRow = {
  accent_color: string | null;
  banner_url: string | null;
  created_at: string;
  description: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  slug: string;
  sort_order: number;
  status: z.infer<typeof supplierStatusSchema>;
  updated_at: string;
  website_url: string | null;
};

type EntityWithId = {
  id: string;
};

function supplierSelect() {
  return "id,name,slug,description,logo_url,banner_url,accent_color,website_url,status,sort_order,created_at,updated_at";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export class SupplierService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listSuppliers(): Promise<SupplierRow[]> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select(supplierSelect())
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar fornecedores");
    }

    return (data ?? []) as unknown as SupplierRow[];
  }

  async listPublicSuppliers(): Promise<SupplierRow[]> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select(supplierSelect())
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throwQueryError(error, "Falha ao listar fornecedores publicos");
    }

    return (data ?? []) as unknown as SupplierRow[];
  }

  async getSupplierById(id: string): Promise<SupplierRow> {
    const { data, error } = await this.supabase
      .from("suppliers")
      .select(supplierSelect())
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar fornecedor");
    }

    if (!data) {
      throw notFound("Fornecedor nao encontrado");
    }

    return data as unknown as SupplierRow;
  }

  async getSupplierBySlug(slug: string, options: { publicOnly?: boolean } = {}): Promise<SupplierRow> {
    let query = this.supabase
      .from("suppliers")
      .select(supplierSelect())
      .eq("slug", slug);

    if (options.publicOnly ?? true) {
      query = query.eq("status", "active");
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar fornecedor");
    }

    if (!data) {
      throw notFound("Fornecedor nao encontrado");
    }

    return data as unknown as SupplierRow;
  }

  async createSupplier(input: CreateSupplierInput): Promise<SupplierRow> {
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    const { data, error } = await this.supabase
      .from("suppliers")
      .insert({
        accent_color: input.accentColor ?? null,
        banner_url: input.bannerUrl ?? null,
        description: input.description ?? null,
        logo_url: input.logoUrl ?? null,
        name: input.name,
        slug,
        sort_order: input.sortOrder,
        status: input.status,
        website_url: input.websiteUrl ?? null,
      })
      .select(supplierSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar fornecedor");
    }

    const created = data as unknown as EntityWithId;

    await this.audit.createAdminActionLog({
      action: "supplier.create",
      adminId: this.actorId,
      entityId: created.id,
      entityType: "supplier",
      newValue: data,
    });

    return data as unknown as SupplierRow;
  }

  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierRow> {
    const current = await this.getSupplierById(id);
    const patch = withoutUndefined({
      accent_color: input.accentColor,
      banner_url: input.bannerUrl,
      description: input.description,
      logo_url: input.logoUrl,
      name: input.name,
      slug: input.slug ? slugify(input.slug) : undefined,
      sort_order: input.sortOrder,
      status: input.status,
      website_url: input.websiteUrl,
    });

    const { data, error } = await this.supabase
      .from("suppliers")
      .update(patch)
      .eq("id", id)
      .select(supplierSelect())
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar fornecedor");
    }

    await this.audit.createAdminActionLog({
      action: "supplier.update",
      adminId: this.actorId,
      entityId: id,
      entityType: "supplier",
      newValue: data,
      oldValue: current,
    });

    return data as unknown as SupplierRow;
  }
}
