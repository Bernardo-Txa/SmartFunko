import { forbidden } from "@/server/http/errors";
import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import { throwQueryError } from "@/server/supabase/query-error";

type PaymentOrderRelation = {
  order_number?: string;
};

type CustomerPaymentRow = {
  amount: number;
  created_at: string;
  method: string;
  orders?: PaymentOrderRelation | PaymentOrderRelation[] | null;
  paid_at: string | null;
  status: string;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

export async function GET() {
  return handleApi(async () => {
    const { customer } = await requireUser();

    if (!customer) {
      throw forbidden("Cliente nao vinculado ao usuario");
    }

    const { data, error } = await createSupabaseAdminClient()
      .from("payments")
      .select("method,amount,status,paid_at,created_at,orders(order_number)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) {
      throwQueryError(error, "Falha ao listar pagamentos do cliente");
    }

    const payments = ((data ?? []) as unknown as CustomerPaymentRow[]).map((payment) => ({
      amount: payment.amount,
      createdAt: payment.created_at,
      method: payment.method,
      orderNumber: firstRelation(payment.orders)?.order_number ?? null,
      paidAt: payment.paid_at,
      status: payment.status,
    }));

    return jsonOk(payments);
  });
}
