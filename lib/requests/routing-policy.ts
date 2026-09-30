import type { RequestPriority } from "@/types";

export type RoutingCandidate = {
  id: string;
  name: string;
  neighborhood: string | null;
  departmentId: string;
  teamId: string | null;
  priority: RequestPriority | null;
};

export function normalizeRoutingText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function selectRoutingRule(
  candidates: RoutingCandidate[],
  neighborhood: string,
) {
  const normalizedNeighborhood = normalizeRoutingText(neighborhood);
  return (
    candidates.find(
      (candidate) =>
        candidate.neighborhood &&
        normalizeRoutingText(candidate.neighborhood) === normalizedNeighborhood,
    ) ?? candidates.find((candidate) => !candidate.neighborhood)
  );
}
