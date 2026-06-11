import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { handleApi, jsonOk } from "@/server/http/responses";
import { assertRafflesEnabled } from "@/server/raffles/raffle-feature";
import { RaffleService } from "@/server/raffles/raffle-service";
import { parseJsonBody } from "@/server/validation/parse-json";

const syncRafflePaymentSchema = z.object({
  slug: z.string().trim().optional().nullable(),
  transactionNsu: z.string().trim().optional().nullable(),
});

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  return handleApi(async () => {
    assertRafflesEnabled();
    const { orderId } = await params;
    const admin = await requireAdmin();
    const input = await parseJsonBody(request, syncRafflePaymentSchema);
    const result = await new RaffleService(undefined, admin.profile.id).syncRafflePayment(
      orderId,
      admin.profile.id,
      input,
    );
    return jsonOk(result);
  });
}
