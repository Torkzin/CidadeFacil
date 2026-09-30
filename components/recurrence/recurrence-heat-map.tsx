"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HeatPoint, RecurrenceGroup } from "@/components/recurrence/recurrence-dashboard";
import { SEROPEDICA } from "@/lib/municipality/seropedica";

function Viewport({ groups, selectedId }: { groups: RecurrenceGroup[]; selectedId: string }) {
  const map = useMap();
  useEffect(() => {
    const selected = groups.find((group) => group.id === selectedId);
    if (selected?.latitude != null && selected.longitude != null)
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [groups, map, selectedId]);
  return null;
}

function heatColor(count: number, maximum: number) {
  const ratio = maximum > 1 ? (count - 1) / (maximum - 1) : 0;
  if (ratio >= 0.66) return "#dc2626";
  if (ratio >= 0.33) return "#f97316";
  return "#facc15";
}

export function RecurrenceHeatMap({ points, groups, selectedId, onSelect }: { points: HeatPoint[]; groups: RecurrenceGroup[]; selectedId: string; onSelect: (id: string) => void }) {
  const maximum = Math.max(1, ...points.map((point) => point.count));
  return (
    <MapContainer center={[Number(SEROPEDICA.cityCenter.latitude), Number(SEROPEDICA.cityCenter.longitude)]} zoom={13} scrollWheelZoom className="absolute inset-0 z-0 h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((point) => {
        const color = heatColor(point.count, maximum);
        return <Circle key={point.id} center={[point.latitude, point.longitude]} radius={110 + Math.min(point.count, 10) * 25} pathOptions={{ color: "transparent", fillColor: color, fillOpacity: 0.22 + Math.min(point.count / maximum, 1) * 0.38 }}><Popup><strong>{point.count} ocorrência{point.count === 1 ? "" : "s"}</strong><br />{point.neighborhood}<br />Predominância: {point.topCategory}</Popup></Circle>;
      })}
      {groups.filter((group) => group.latitude != null && group.longitude != null).map((group) => (
        <Circle key={group.id} center={[group.latitude!, group.longitude!]} radius={group.id === selectedId ? 55 : 32} pathOptions={{ color: group.id === selectedId ? "#7c2d12" : group.categoryColor, weight: 3, fillColor: group.categoryColor, fillOpacity: 0.8 }} eventHandlers={{ click: () => onSelect(group.id) }}><Popup><strong>{group.count} reincidências</strong><br />{group.address}<br />{group.category}</Popup></Circle>
      ))}
      <Viewport groups={groups} selectedId={selectedId} />
    </MapContainer>
  );
}
