import { requireAdmin } from "@/server/auth/require-admin";
import { notFound } from "@/server/http/errors";
import { handleApi, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const admin = await requireAdmin();
    const supabase = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("[AdminOrderPayments] order lookup failed", {
        adminId: admin.profile.id,
        error: orderError,
        orderId: id,
      });
      throwQueryError(orderError, "Falha ao buscar pedido para pagamentos");
    }

    if (!order) {
      throw notFound("Pedido nao encontrado");
    }

    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,order_id,customer_id,method,amount,fee_amount,net_amount,status,paid_at,created_at,
        provider,provider_reference,payment_link_url,
        payment_max_installments,payment_max_installments_source,payment_fee_mode,paid_installments,
        provider_payment_method,provider_fee_amount
      `)
      .eq("order_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AdminOrderPayments] payments lookup failed", {
        adminId: admin.profile.id,
        error,
        orderId: id,
      });
      throwQueryError(error, "Falha ao listar pagamentos do pedido");
    }

    return jsonOk(data ?? []);
  });
}
