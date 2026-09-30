import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, groupNearbyStops, orderNearestStops, routeDistanceKm } from "../lib/work-orders/route-planning.ts";

const points = [
  { id: "a", latitude: -22.743, longitude: -43.704 },
  { id: "b", latitude: -22.745, longitude: -43.706 },
  { id: "c", latitude: -22.8, longitude: -43.75 },
];

test("calcula distância geográfica em quilômetros", () => {
  assert.ok(distanceKm(points[0], points[1]) > 0.2);
  assert.ok(distanceKm(points[0], points[1]) < 0.4);
});

test("agrupa paradas próximas e separa regiões distantes", () => {
  const groups = groupNearbyStops(points, 1);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.length), [2, 1]);
});

test("ordena a próxima parada pela menor distância e soma o trajeto", () => {
  const ordered = orderNearestStops([points[0], points[2], points[1]]);
  assert.deepEqual(ordered.map((point) => point.id), ["a", "b", "c"]);
  assert.ok(routeDistanceKm(ordered) > 0);
});
