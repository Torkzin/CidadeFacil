export type GeoPoint = {
  id: string;
  latitude: number;
  longitude: number;
};

const earthRadiusKm = 6371;

export function distanceKm(a: GeoPoint, b: GeoPoint) {
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latitudeA = (a.latitude * Math.PI) / 180;
  const latitudeB = (b.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function orderNearestStops<T extends GeoPoint>(points: T[]) {
  if (points.length < 2) return [...points];
  const remaining = [...points.slice(1)];
  const ordered = [points[0]];
  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDistance = distanceKm(current, remaining[0]);
    for (let index = 1; index < remaining.length; index += 1) {
      const candidateDistance = distanceKm(current, remaining[index]);
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestIndex = index;
      }
    }
    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }
  return ordered;
}

export function groupNearbyStops<T extends GeoPoint>(points: T[], maximumDistanceKm: number) {
  const remaining = new Set(points.map((point) => point.id));
  const byId = new Map(points.map((point) => [point.id, point]));
  const groups: T[][] = [];

  for (const point of points) {
    if (!remaining.has(point.id)) continue;
    const component: T[] = [];
    const queue = [point];
    remaining.delete(point.id);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const candidateId of [...remaining]) {
        const candidate = byId.get(candidateId)!;
        if (distanceKm(current, candidate) <= maximumDistanceKm) {
          remaining.delete(candidateId);
          queue.push(candidate);
        }
      }
    }
    groups.push(orderNearestStops(component));
  }

  return groups.sort((a, b) => b.length - a.length);
}

export function routeDistanceKm(points: GeoPoint[]) {
  return points.slice(1).reduce((total, point, index) => total + distanceKm(points[index], point), 0);
}
