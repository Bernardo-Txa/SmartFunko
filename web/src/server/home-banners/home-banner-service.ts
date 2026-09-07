import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { z } from "zod";
import { hasSupabaseAdminEnv } from "@/lib/env";
import { AuditLogService } from "@/server/audit/audit-log-service";
import { badRequest, notFound } from "@/server/http/errors";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const homeBannerStatusSchema = z.enum(["active", "inactive", "archived"]);

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

const assetUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim();
  },
  z.string().min(1).refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Informe uma URL http(s) ou um caminho interno iniciado por /",
  ),
);

const nullableAssetUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Informe uma URL http(s) ou um caminho interno iniciado por /",
  ).nullable().optional(),
);

const nullableLinkSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Informe um link http(s) ou um caminho interno iniciado por /",
  ).nullable().optional(),
);

const nullableDateTimeSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().datetime().nullable().optional(),
);

const homeBannerObjectSchema = z.object({
  buttonLabel: nullableTextSchema,
  displayOrder: z.number().int().default(0),
  endsAt: nullableDateTimeSchema,
  eyebrow: nullableTextSchema,
  imageUrl: assetUrlSchema,
  linkUrl: nullableLinkSchema,
  mobileImageUrl: nullableAssetUrlSchema,
  openInNewTab: z.boolean().default(false),
  startsAt: nullableDateTimeSchema,
  status: homeBannerStatusSchema.default("active"),
  subtitle: nullableTextSchema,
  title: z.string().trim().min(2),
});

function validateBannerPeriod(
  value: { endsAt?: string | null; startsAt?: string | null },
  context: z.RefinementCtx,
) {
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    context.addIssue({
      code: "custom",
      message: "Inicio deve ser anterior ao fim",
      path: ["startsAt"],
    });
  }
}

export const createHomeBannerSchema = homeBannerObjectSchema.superRefine(validateBannerPeriod);
export const updateHomeBannerSchema = homeBannerObjectSchema.partial().superRefine(validateBannerPeriod);

export type HomeBannerStatus = z.infer<typeof homeBannerStatusSchema>;
export type CreateHomeBannerInput = z.infer<typeof createHomeBannerSchema>;
export type UpdateHomeBannerInput = z.infer<typeof updateHomeBannerSchema>;

export type HomeBanner = {
  buttonLabel?: string | null;
  createdAt: string;
  displayOrder: number;
  endsAt?: string | null;
  eyebrow?: string | null;
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  mobileImageUrl?: string | null;
  openInNewTab: boolean;
  startsAt?: string | null;
  status: HomeBannerStatus;
  subtitle?: string | null;
  title: string;
  updatedAt: string;
};

type HomeBannerRow = {
  button_label: string | null;
  created_at: string;
  display_order: number;
  ends_at: string | null;
  eyebrow: string | null;
  id: string;
  image_url: string;
  link_url: string | null;
  mobile_image_url: string | null;
  open_in_new_tab: boolean;
  starts_at: string | null;
  status: HomeBannerStatus;
  subtitle: string | null;
  title: string;
  updated_at: string;
};

const homeBannerSelect = `
  id,title,subtitle,eyebrow,image_url,mobile_image_url,link_url,button_label,status,
  display_order,open_in_new_tab,starts_at,ends_at,created_at,updated_at
`;

function mapHomeBanner(row: HomeBannerRow): HomeBanner {
  return {
    buttonLabel: row.button_label,
    createdAt: row.created_at,
    displayOrder: row.display_order,
    endsAt: row.ends_at,
    eyebrow: row.eyebrow,
    id: row.id,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    mobileImageUrl: row.mobile_image_url,
    openInNewTab: row.open_in_new_tab,
    startsAt: row.starts_at,
    status: row.status,
    subtitle: row.subtitle,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function toRow(input: CreateHomeBannerInput | UpdateHomeBannerInput, actorId?: string) {
  const row = {
    button_label: input.buttonLabel,
    display_order: input.displayOrder,
    ends_at: input.endsAt,
    eyebrow: input.eyebrow,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
    mobile_image_url: input.mobileImageUrl,
    open_in_new_tab: input.openInNewTab,
    starts_at: input.startsAt,
    status: input.status,
    subtitle: input.subtitle,
    title: input.title,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  };

  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  );
}

function isMissingHomeBannerSchema(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "PGRST205" || code === "PGRST200";
}

async function listPublicHomeBannersUncached(): Promise<HomeBanner[]> {
  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const now = Date.now();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("home_banners")
    .select(homeBannerSelect)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    if (!isMissingHomeBannerSchema(error)) {
      console.error("Falha ao listar banners publicos da home", error);
    }

    return [];
  }

  return ((data ?? []) as HomeBannerRow[])
    .map(mapHomeBanner)
    .filter((banner) => {
      const startsAt = banner.startsAt ? new Date(banner.startsAt).getTime() : null;
      const endsAt = banner.endsAt ? new Date(banner.endsAt).getTime() : null;

      return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
    })
    .slice(0, 8);
}

const getCachedPublicHomeBanners = unstable_cache(
  listPublicHomeBannersUncached,
  ["home-banners-public"],
  {
    revalidate: 60,
    tags: ["home-banners"],
  },
);

export async function getPublicHomeBanners() {
  return getCachedPublicHomeBanners();
}

export class HomeBannerService {
  private readonly audit: AuditLogService;

  constructor(
    private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient(),
    private readonly actorId?: string,
  ) {
    this.audit = new AuditLogService(this.supabase);
  }

  async listAdminHomeBanners(status: HomeBannerStatus | "all" = "all") {
    let query = this.supabase
      .from("home_banners")
      .select(homeBannerSelect)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    } else {
      query = query.neq("status", "archived");
    }

    const { data, error } = await query;

    if (error) {
      throwQueryError(error, "Falha ao listar banners da home");
    }

    return ((data ?? []) as HomeBannerRow[]).map(mapHomeBanner);
  }

  async createHomeBanner(input: CreateHomeBannerInput) {
    if (!input.imageUrl) {
      throw badRequest("Imagem do banner obrigatoria");
    }

    const { data, error } = await this.supabase
      .from("home_banners")
      .insert({
        ...toRow(input, this.actorId),
        created_by: this.actorId,
      })
      .select(homeBannerSelect)
      .single();

    if (error) {
      throwQueryError(error, "Falha ao criar banner da home");
    }

    const banner = mapHomeBanner(data as HomeBannerRow);

    await this.audit.createAdminActionLog({
      action: "home_banner.create",
      adminId: this.actorId,
      entityId: banner.id,
      entityType: "home_banner",
      newValue: banner,
    });

    revalidateTag("home-banners", "max");

    return banner;
  }

  async updateHomeBanner(id: string, input: UpdateHomeBannerInput) {
    const current = await this.getHomeBannerById(id);
    const { data, error } = await this.supabase
      .from("home_banners")
      .update(toRow(input, this.actorId))
      .eq("id", id)
      .select(homeBannerSelect)
      .single();

    if (error) {
      throwQueryError(error, "Falha ao atualizar banner da home");
    }

    const banner = mapHomeBanner(data as HomeBannerRow);

    await this.audit.createAdminActionLog({
      action: "home_banner.update",
      adminId: this.actorId,
      entityId: banner.id,
      entityType: "home_banner",
      newValue: banner,
      oldValue: current,
    });

    revalidateTag("home-banners", "max");

    return banner;
  }

  async deleteHomeBanner(id: string) {
    const current = await this.getHomeBannerById(id);
    const { error } = await this.supabase
      .from("home_banners")
      .delete()
      .eq("id", id);

    if (error) {
      throwQueryError(error, "Falha ao excluir banner da home");
    }

    await this.audit.createAdminActionLog({
      action: "home_banner.delete",
      adminId: this.actorId,
      entityId: id,
      entityType: "home_banner",
      oldValue: current,
    });

    revalidateTag("home-banners", "max");
  }

  async getHomeBannerById(id: string) {
    const { data, error } = await this.supabase
      .from("home_banners")
      .select(homeBannerSelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throwQueryError(error, "Falha ao buscar banner da home");
    }

    if (!data) {
      throw notFound("Banner da home nao encontrado");
    }

    return mapHomeBanner(data as HomeBannerRow);
  }
}
