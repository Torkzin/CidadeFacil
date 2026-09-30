export type AddressForGeocoding = {
  address: string;
  addressNumber?: string;
  neighborhood: string;
  postalCode?: string;
};

export type GeocodedAddress = {
  latitude: string;
  longitude: string;
  displayName: string;
};

export function addressSignature(input: AddressForGeocoding) {
  return [
    input.address,
    input.addressNumber,
    input.neighborhood,
    input.postalCode,
  ]
    .map((value) => value?.trim().toLocaleLowerCase("pt-BR") ?? "")
    .join("|");
}

export async function geocodeSeropedicaAddress(input: AddressForGeocoding) {
  const response = await fetch("/api/public/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as GeocodedAddress & { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? "Não foi possível localizar o endereço.");
  return data;
}
