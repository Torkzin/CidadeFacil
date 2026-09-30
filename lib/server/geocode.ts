import "server-only";

type GeocodeInput = {
  address: string;
  addressNumber?: string;
  neighborhood: string;
  postalCode?: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

type GeocodeResult = {
  latitude: string;
  longitude: string;
  displayName: string;
};

const globalGeocoder = globalThis as typeof globalThis & {
  cidadeFacilGeocodeCache?: Map<string, GeocodeResult>;
  cidadeFacilGeocodeQueue?: Promise<void>;
  cidadeFacilLastGeocodeAt?: number;
};

const cache =
  globalGeocoder.cidadeFacilGeocodeCache ?? new Map<string, GeocodeResult>();
globalGeocoder.cidadeFacilGeocodeCache = cache;

function cacheKey(input: GeocodeInput) {
  return [
    input.address,
    input.addressNumber,
    input.neighborhood,
    input.postalCode,
  ]
    .map((value) => value?.trim().toLocaleLowerCase("pt-BR") ?? "")
    .join("|");
}

function inSeropedica(latitude: number, longitude: number) {
  return (
    latitude >= -22.9 &&
    latitude <= -22.6 &&
    longitude >= -43.9 &&
    longitude <= -43.5
  );
}

async function queryNominatim(input: GeocodeInput) {
  const query = [
    [input.addressNumber, input.address].filter(Boolean).join(" "),
    input.neighborhood,
    "Seropédica",
    "Rio de Janeiro",
    input.postalCode,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  const baseUrl =
    process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org";
  const url = new URL("/search", baseUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("viewbox", "-43.9,-22.6,-43.5,-22.9");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "pt-BR",
      "User-Agent": "CidadeFacil/0.1 (gestao municipal de Seropedica)",
    },
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "O serviço de localização está temporariamente indisponível.",
    );
  const candidates = (await response.json()) as NominatimResult[];
  const result = candidates.find((candidate) =>
    inSeropedica(Number(candidate.lat), Number(candidate.lon)),
  );
  if (!result) return null;
  return {
    latitude: result.lat,
    longitude: result.lon,
    displayName: result.display_name,
  } satisfies GeocodeResult;
}

export async function geocodeSeropedicaAddress(input: GeocodeInput) {
  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached) return cached;

  const previous = globalGeocoder.cidadeFacilGeocodeQueue ?? Promise.resolve();
  let resolveQueue: () => void = () => undefined;
  globalGeocoder.cidadeFacilGeocodeQueue = new Promise<void>((resolve) => {
    resolveQueue = resolve;
  });
  await previous;
  try {
    const elapsed = Date.now() - (globalGeocoder.cidadeFacilLastGeocodeAt ?? 0);
    if (elapsed < 1_100)
      await new Promise((resolve) => setTimeout(resolve, 1_100 - elapsed));
    const result = await queryNominatim(input);
    globalGeocoder.cidadeFacilLastGeocodeAt = Date.now();
    if (result) {
      if (cache.size >= 1_000) cache.delete(cache.keys().next().value!);
      cache.set(key, result);
    }
    return result;
  } finally {
    resolveQueue();
  }
}
