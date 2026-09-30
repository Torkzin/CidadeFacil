"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "@/components/work-orders/field-route-planner";
import { SEROPEDICA } from "@/lib/municipality/seropedica";

function numberedIcon(index: number, selected: boolean) {
  return L.divIcon({
    className: "cidadefacil-route-marker",
    html: `<span class="${selected ? "is-selected" : ""}">${index + 1}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function RouteViewport({ stops }: { stops: RouteStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], 16);
    } else if (stops.length > 1) {
      map.fitBounds(stops.map((stop) => [stop.latitude, stop.longitude]), { padding: [48, 48], maxZoom: 16 });
    }
  }, [map, stops]);
  return null;
}

export function FieldRouteMapCanvas({ stops, selectedId, onSelect }: { stops: RouteStop[]; selectedId: string; onSelect: (id: string) => void }) {
  const icons = useMemo(() => new Map(stops.map((stop, index) => [stop.id, numberedIcon(index, stop.id === selectedId)])), [stops, selectedId]);
  const line = stops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  return (
    <MapContainer center={[Number(SEROPEDICA.cityCenter.latitude), Number(SEROPEDICA.cityCenter.longitude)]} zoom={13} scrollWheelZoom className="absolute inset-0 z-0 h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#0e7490", weight: 5, opacity: 0.8, dashArray: "8 8" }} />}
      {stops.map((stop, index) => (
        <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={icons.get(stop.id)} eventHandlers={{ click: () => onSelect(stop.id) }} zIndexOffset={stop.id === selectedId ? 1000 : 0}>
          <Popup><strong>{index + 1}. {stop.requestTitle}</strong><br />{stop.number} · {stop.neighborhood}</Popup>
        </Marker>
      ))}
      <RouteViewport stops={stops} />
    </MapContainer>
  );
}
