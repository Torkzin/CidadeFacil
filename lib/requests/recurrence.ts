import { distanceKm } from "../work-orders/route-planning.ts";

export type RecurrenceOccurrence = {
  id: string;
  protocol: string;
  title: string;
  categoryId: string;
  category: string;
  categoryColor: string;
  status: string;
  address: string;
  addressNumber: string | null;
  neighborhood: string;
  latitude: string | null;
  longitude: string | null;
  createdAt: Date | string;
};

export type SimilarOccurrence = RecurrenceOccurrence & {
  distanceMeters: number | null;
  matchReason: "Mesmo endereço" | "Local próximo";
};

const maximumNearbyDistanceKm = 0.2;

export function normalizeLocation(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b(rua|r\.?|avenida|av\.?|estrada|rodovia|travessa|tv\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function coordinates(item: Pick<RecurrenceOccurrence, "id" | "latitude" | "longitude">) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { id: item.id, latitude, longitude }
    : null;
}

function exactAddress(
  a: Pick<RecurrenceOccurrence, "address" | "addressNumber">,
  b: Pick<RecurrenceOccurrence, "address" | "addressNumber">,
) {
  const streetA = normalizeLocation(a.address);
  const streetB = normalizeLocation(b.address);
  const numberA = normalizeLocation(a.addressNumber);
  const numberB = normalizeLocation(b.addressNumber);
  return Boolean(
    streetA &&
      streetA === streetB &&
      ((numberA && numberA === numberB) || (!numberA && !numberB)),
  );
}

export function occurrenceMatch(
  a: RecurrenceOccurrence,
  b: RecurrenceOccurrence,
) {
  if (a.categoryId !== b.categoryId) return null;
  if (exactAddress(a, b)) {
    return { distanceMeters: null, matchReason: "Mesmo endereço" as const };
  }
  const pointA = coordinates(a);
  const pointB = coordinates(b);
  if (!pointA || !pointB) return null;
  const kilometers = distanceKm(pointA, pointB);
  return kilometers <= maximumNearbyDistanceKm
    ? {
        distanceMeters: Math.round(kilometers * 1000),
        matchReason: "Local próximo" as const,
      }
    : null;
}

export function findSimilarOccurrences(
  candidate: RecurrenceOccurrence,
  existing: RecurrenceOccurrence[],
  limit = 5,
) {
  return existing
    .map((item): SimilarOccurrence | null => {
      const match = occurrenceMatch(candidate, item);
      return match ? { ...item, ...match } : null;
    })
    .filter((item): item is SimilarOccurrence => item !== null)
    .sort((a, b) => {
      if (a.matchReason !== b.matchReason)
        return a.matchReason === "Mesmo endereço" ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

export function buildRecurrenceAnalysis(items: RecurrenceOccurrence[]) {
  const remaining = new Set(items.map((item) => item.id));
  const byId = new Map(items.map((item) => [item.id, item]));
  const groups: RecurrenceOccurrence[][] = [];

  for (const item of items) {
    if (!remaining.has(item.id)) continue;
    const group: RecurrenceOccurrence[] = [];
    const queue = [item];
    remaining.delete(item.id);
    while (queue.length) {
      const current = queue.shift()!;
      group.push(current);
      for (const candidateId of [...remaining]) {
        const candidate = byId.get(candidateId)!;
        if (occurrenceMatch(current, candidate)) {
          remaining.delete(candidateId);
          queue.push(candidate);
        }
      }
    }
    if (group.length > 1) groups.push(group);
  }

  const recurrentGroups = groups
    .map((group) => {
      const sorted = group.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const located = sorted.map(coordinates).filter((point) => point !== null);
      return {
        id: sorted.map((item) => item.id).sort().join(":"),
        count: sorted.length,
        category: sorted[0].category,
        categoryColor: sorted[0].categoryColor,
        address: `${sorted[0].address}${sorted[0].addressNumber ? `, ${sorted[0].addressNumber}` : ""}`,
        neighborhood: sorted[0].neighborhood,
        latitude: located.length
          ? located.reduce((sum, point) => sum + point.latitude, 0) / located.length
          : null,
        longitude: located.length
          ? located.reduce((sum, point) => sum + point.longitude, 0) / located.length
          : null,
        activeCount: sorted.filter(
          (entry) => !["Concluída", "Cancelada"].includes(entry.status),
        ).length,
        lastOccurrenceAt: new Date(sorted[0].createdAt).toISOString(),
        items: sorted,
      };
    })
    .sort((a, b) => b.count - a.count || b.activeCount - a.activeCount);

  const heatCells = new Map<
    string,
    {
      latitudeTotal: number;
      longitudeTotal: number;
      count: number;
      neighborhood: string;
      categories: Map<string, number>;
    }
  >();
  for (const item of items) {
    const point = coordinates(item);
    if (!point) continue;
    const key = `${Math.round(point.latitude / 0.002)}:${Math.round(point.longitude / 0.002)}`;
    const cell = heatCells.get(key) ?? {
      latitudeTotal: 0,
      longitudeTotal: 0,
      count: 0,
      neighborhood: item.neighborhood,
      categories: new Map<string, number>(),
    };
    cell.latitudeTotal += point.latitude;
    cell.longitudeTotal += point.longitude;
    cell.count += 1;
    cell.categories.set(item.category, (cell.categories.get(item.category) ?? 0) + 1);
    heatCells.set(key, cell);
  }
  const heatPoints = [...heatCells.entries()]
    .map(([id, cell]) => ({
      id,
      latitude: cell.latitudeTotal / cell.count,
      longitude: cell.longitudeTotal / cell.count,
      count: cell.count,
      neighborhood: cell.neighborhood,
      topCategory: [...cell.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    }))
    .sort((a, b) => b.count - a.count);

  return {
    groups: recurrentGroups,
    heatPoints,
    summary: {
      totalOccurrences: items.length,
      recurrentGroups: recurrentGroups.length,
      recurrentOccurrences: recurrentGroups.reduce((sum, group) => sum + group.count, 0),
      activeRecurrences: recurrentGroups.reduce((sum, group) => sum + group.activeCount, 0),
      neighborhoodsAffected: new Set(recurrentGroups.map((group) => group.neighborhood)).size,
    },
  };
}
