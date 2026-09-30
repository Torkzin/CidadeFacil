import "server-only";
import { and, desc, eq, gte, ne, type SQL } from "drizzle-orm";
import { categories, requests } from "@/db/schema";
import { db } from "@/lib/db";
import {
  buildRecurrenceAnalysis,
  findSimilarOccurrences,
  type RecurrenceOccurrence,
} from "@/lib/requests/recurrence";

const occurrenceSelection = {
  id: requests.id,
  protocol: requests.protocol,
  title: requests.title,
  categoryId: requests.categoryId,
  category: categories.name,
  categoryColor: categories.color,
  status: requests.status,
  address: requests.address,
  addressNumber: requests.addressNumber,
  neighborhood: requests.neighborhood,
  latitude: requests.latitude,
  longitude: requests.longitude,
  createdAt: requests.createdAt,
};

export async function loadOccurrences(conditions: SQL[]) {
  return db
    .select(occurrenceSelection)
    .from(requests)
    .innerJoin(categories, eq(categories.id, requests.categoryId))
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt));
}

export async function recurrenceAnalysis(conditions: SQL[]) {
  return buildRecurrenceAnalysis(await loadOccurrences(conditions));
}

export async function similarRequests({
  municipalityId,
  categoryId,
  address,
  addressNumber,
  neighborhood,
  latitude,
  longitude,
}: {
  municipalityId: string;
  categoryId: string;
  address: string;
  addressNumber: string | null;
  neighborhood: string;
  latitude: string | null;
  longitude: string | null;
}) {
  const since = new Date();
  since.setDate(since.getDate() - 365);
  const items = await loadOccurrences([
    eq(requests.municipalityId, municipalityId),
    eq(requests.categoryId, categoryId),
    ne(requests.status, "Cancelada"),
    gte(requests.createdAt, since),
  ]);
  const candidate: RecurrenceOccurrence = {
    id: "candidate",
    protocol: "",
    title: "",
    categoryId,
    category: items[0]?.category ?? "",
    categoryColor: items[0]?.categoryColor ?? "#0e7490",
    status: "Aberta",
    address,
    addressNumber,
    neighborhood,
    latitude,
    longitude,
    createdAt: new Date(),
  };
  return findSimilarOccurrences(candidate, items);
}
