import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient, type SupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export const wishlistCreateSchema = z.object({
  productId: z.string().uuid(),
  desiredPrice: z.number().nonnegative().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().trim().optional().nullable(),
});

export class WishlistService {
  constructor(private readonly supabase: SupabaseAdminClient = createSupabaseAdminClient()) {}

  async listWishlist(customerId: string) {
    const { data, error } = await this.supabase
      .from("wishlist_items")
      .select("id,customer_id,product_id,desired_price,priority,notes,created_at,products(id,name,slug,main_image_url)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar wishlist");
    }

    return data ?? [];
  }

  async addWishlistItem(customerId: string, input: z.infer<typeof wishlistCreateSchema>) {
    const { data, error } = await this.supabase
      .from("wishlist_items")
      .upsert(
        {
          customer_id: customerId,
          desired_price: input.desiredPrice ?? null,
          notes: input.notes ?? null,
          priority: input.priority,
          product_id: input.productId,
        },
        { onConflict: "customer_id,product_id" },
      )
      .select("id,customer_id,product_id,desired_price,priority,notes,created_at")
      .single();

    if (error) {
      throwQueryError(error, "Falha ao salvar wishlist");
    }

    return data;
  }

  async deleteWishlistItem(customerId: string, id: string) {
    const { error } = await this.supabase
      .from("wishlist_items")
      .delete()
      .eq("id", id)
      .eq("customer_id", customerId);

    if (error) {
      throwQueryError(error, "Falha ao remover wishlist");
    }
  }
}
