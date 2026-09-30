"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "@/components/map/requests-map";
import { SEROPEDICA } from "@/lib/municipality/seropedica";

const categorySymbols: Array<[RegExp, string]> = [
  [/ilumina|poste|energia/i, "💡"],
  [/bueiro/i, "🕳️"],
  [/buraco|via|asfalto|pavimenta/i, "🛣️"],
  [/lixo|coleta|resíduo|entulho/i, "🗑️"],
  [/árvore|arvore|poda|vegetação/i, "🌳"],
  [/água|agua|esgoto|saneamento|drenagem/i, "💧"],
  [/saúde|saude|hospital|médic/i, "🏥"],
  [/transporte|ônibus|onibus|trânsito|transito/i, "🚌"],
  [/animal/i, "🐾"],
  [/educação|educacao|escola/i, "🏫"],
  [/segurança|seguranca/i, "🛡️"],
];

function symbolFor(category: string) {
  return (
    categorySymbols.find(([pattern]) => pattern.test(category))?.[1] ?? "📍"
  );
}

function markerIcon(point: MapPoint) {
  const color = /^#[0-9a-f]{6}$/i.test(point.categoryColor)
    ? point.categoryColor
    : "#0e7490";
  return L.divIcon({
    className: "cidadefacil-map-marker",
    html: `<span style="--marker-color:${color}"><b>${symbolFor(point.category)}</b></span>`,
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -42],
  });
}

function MapViewport({
  points,
  selectedId,
}: {
  points: MapPoint[];
  selectedId: string;
}) {
  const map = useMap();
  useEffect(() => {
    const selected = points.find((point) => point.id === selectedId);
    if (selected) {
      map.flyTo(
        [Number(selected.latitude), Number(selected.longitude)],
        Math.max(map.getZoom(), 15),
        { duration: 0.7 },
      );
    } else if (points.length > 1) {
      map.fitBounds(
        points.map((point) => [
          Number(point.latitude),
          Number(point.longitude),
        ]),
        { padding: [42, 42], maxZoom: 15 },
      );
    }
  }, [map, points, selectedId]);
  return null;
}

export function RequestsMapCanvas({
  points,
  selectedId,
  onSelect,
}: {
  points: MapPoint[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const icons = useMemo(
    () => new Map(points.map((point) => [point.id, markerIcon(point)])),
    [points],
  );
  return (
    <MapContainer
      center={[
        Number(SEROPEDICA.cityCenter.latitude),
        Number(SEROPEDICA.cityCenter.longitude),
      ]}
      zoom={13}
      scrollWheelZoom
      className="absolute inset-0 z-0 h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[Number(point.latitude), Number(point.longitude)]}
          icon={icons.get(point.id)}
          eventHandlers={{ click: () => onSelect(point.id) }}
          zIndexOffset={point.id === selectedId ? 1000 : 0}
        >
          <Popup>
            <strong>{point.title}</strong>
            <br />
            {point.protocol} · {point.category}
          </Popup>
        </Marker>
      ))}
      <MapViewport points={points} selectedId={selectedId} />
    </MapContainer>
  );
}
