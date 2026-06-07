import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { badRequest, internalError } from "@/server/http/errors";
import { handleApi, jsonCreated } from "@/server/http/responses";
import {
  ProductService,
  type ProductImageRow,
} from "@/server/products/product-service";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";

type Params = {
  params: Promise<{ id: string }>;
};

type ProductImageMainResponse = {
  id: string;
  main_image_url: string | null;
};

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
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

function parseBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
}

function sanitizeFilename(filename: string, mimeType: AllowedMimeType) {
  const basename = filename.split(/[\\/]/).pop() ?? "image";
  const withoutExtension = basename.replace(/\.[^.]+$/, "");
  const safeBasename = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBasename || "image"}.${allowedMimeExtensions[mimeType]}`;
}

function toImageResponse(image: ProductImageRow) {
  return {
    id: image.id,
    imageUrl: image.image_url,
    productId: image.product_id,
    sortOrder: image.sort_order,
  };
}

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const supabase = createSupabaseAdminClient();
    const productService = new ProductService(supabase, admin.profile.id);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw badRequest("Arquivo de imagem obrigatorio");
    }

    if (file.size <= 0) {
      throw badRequest("Arquivo de imagem vazio");
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw badRequest("Imagem deve ter ate 5MB");
    }

    if (!isAllowedMimeType(file.type)) {
      throw badRequest("Tipo de imagem nao permitido");
    }

    await productService.getProductById(id);

    const safeFilename = sanitizeFilename(file.name, file.type);
    const storagePath = `products/${id}/${Date.now()}-${randomUUID()}-${safeFilename}`;
    const uploadResult = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      console.error("Product image upload failed", uploadResult.error);
      throw internalError("Falha ao enviar imagem para o Storage");
    }

    const publicUrl = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(storagePath).data.publicUrl;

    if (!publicUrl) {
      throw internalError("Falha ao gerar URL publica da imagem");
    }

    let image: ProductImageRow;

    try {
      image = await productService.addProductImage(id, publicUrl);
    } catch (error) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([storagePath]);
      throw error;
    }

    const setAsMain = parseBoolean(formData.get("setAsMain"));
    const product = setAsMain
      ? ((await productService.setMainProductImage(id, image.id)) as unknown as ProductImageMainResponse)
      : undefined;

    revalidateTag("catalog-products", "max");
    revalidateTag("catalog-options", "max");

    return jsonCreated({
      image: toImageResponse(image),
      product: product
        ? {
            id: product.id,
            mainImageUrl: product.main_image_url,
          }
        : undefined,
    });
  });
}
