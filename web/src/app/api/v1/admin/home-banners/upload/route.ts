import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { badRequest, internalError } from "@/server/http/errors";
import { handleApi, jsonCreated } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

const HOME_BANNERS_BUCKET = "home-banners";
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
const allowedMimeExtensions = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMimeType = keyof typeof allowedMimeExtensions;

function isAllowedMimeType(value: string): value is AllowedMimeType {
  return value in allowedMimeExtensions;
}

function sanitizeFilename(filename: string, mimeType: AllowedMimeType) {
  const basename = filename.split(/[\\/]/).pop() ?? "banner";
  const withoutExtension = basename.replace(/\.[^.]+$/, "");
  const safeBasename = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBasename || "banner"}.${allowedMimeExtensions[mimeType]}`;
}

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw badRequest("Arquivo de imagem obrigatorio");
    }

    if (file.size <= 0) {
      throw badRequest("Arquivo de imagem vazio");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw badRequest("Imagem deve ter ate 15MB");
    }

    if (!isAllowedMimeType(file.type)) {
      throw badRequest("Tipo de imagem nao permitido");
    }

    const supabase = createSupabaseAdminClient();
    const safeFilename = sanitizeFilename(file.name, file.type);
    const storagePath = `${Date.now()}-${randomUUID()}-${safeFilename}`;
    const uploadResult = await supabase.storage
      .from(HOME_BANNERS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      console.error("Home banner upload failed", uploadResult.error);
      throw internalError("Falha ao enviar banner para o Storage");
    }

    const publicUrl = supabase.storage
      .from(HOME_BANNERS_BUCKET)
      .getPublicUrl(storagePath).data.publicUrl;

    if (!publicUrl) {
      throw internalError("Falha ao gerar URL publica do banner");
    }

    revalidateTag("home-banners", "max");

    return jsonCreated({
      imageUrl: publicUrl,
      path: storagePath,
    });
  });
}
