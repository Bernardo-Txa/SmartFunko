import { NextResponse } from "next/server";

type ViaCepResponse = {
  bairro?: string;
  erro?: boolean;
  localidade?: string;
  logradouro?: string;
  uf?: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ postalCode: string }> },
) {
  const { postalCode } = await context.params;
  const digits = postalCode.replace(/\D/g, "");

  if (digits.length !== 8) {
    return NextResponse.json(
      { error: { message: "Informe um CEP válido." } },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error("Postal code provider unavailable");
    }

    const result = (await response.json()) as ViaCepResponse;

    if (result.erro) {
      return NextResponse.json(
        { error: { message: "CEP não encontrado." } },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: {
        city: result.localidade ?? "",
        neighborhood: result.bairro ?? "",
        state: result.uf ?? "",
        street: result.logradouro ?? "",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Não foi possível consultar o CEP agora." } },
      { status: 502 },
    );
  }
}
