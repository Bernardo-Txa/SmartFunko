import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

export async function GET() {
  return handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const { data, error } = await createSupabaseAdminClient()
      .from("payments")
      .select("id,order_id,method,amount,fee_amount,net_amount,status,paid_at,created_at,orders(order_number)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pagamentos do cliente");
    }

    return jsonOk(data ?? []);
  });
}
