import { NextResponse } from "next/server";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import {
  checkRateLimit,
  clientAddress,
  envNumber,
} from "@/lib/security/rate-limit";
import { apiError } from "@/lib/server/api";
import { geocodeSeropedicaAddress } from "@/lib/server/geocode";
import { inputText } from "@/lib/server/input";

export async function POST(request: Request) {
  const rate = checkRateLimit(
    `geocode:${clientAddress(request)}`,
    envNumber("RATE_LIMIT_GEOCODE_MAX", 30),
    envNumber("RATE_LIMIT_GEOCODE_WINDOW_MS", 60 * 60 * 1_000),
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Limite temporário de pesquisas de endereço atingido. Tente novamente mais tarde.",
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const address = inputText(body.address, 240);
  const addressNumber = inputText(body.addressNumber, 30);
  const neighborhood = inputText(body.neighborhood, 120);
  const postalCode = inputText(body.postalCode, 16);
  if (!address || !neighborhood)
    return apiError(
      "Informe o endereço e o bairro para localizar no mapa.",
      422,
    );
  if (
    !SEROPEDICA_NEIGHBORHOOD_NAMES.includes(
      neighborhood as (typeof SEROPEDICA_NEIGHBORHOOD_NAMES)[number],
    )
  )
    return apiError("Selecione um bairro válido de Seropédica.", 422);
  if (postalCode && !/^2389\d-?\d{3}$/.test(postalCode))
    return apiError("Informe um CEP válido de Seropédica.", 422);

  try {
    const result = await geocodeSeropedicaAddress({
      address,
      addressNumber,
      neighborhood,
      postalCode,
    });
    if (!result)
      return apiError(
        "Endereço não encontrado em Seropédica. Confira rua, número, bairro e CEP.",
        404,
      );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(
      error instanceof Error
        ? error.message
        : "Não foi possível localizar o endereço.",
      502,
    );
  }
}
