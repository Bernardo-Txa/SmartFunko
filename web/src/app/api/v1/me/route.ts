import { requireUser } from "@/server/auth/require-user";
import { handleApi, jsonOk } from "@/server/http/responses";

export async function GET() {
  return handleApi(async () => {
    const { authUser, customer, profile } = await requireUser();
    return jsonOk({
      customer,
      profile,
      user: {
        email: authUser.email,
        id: authUser.id,
      },
    });
  });
}
