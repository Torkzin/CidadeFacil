"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListFilter, Loader2, MapPin, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestStatus } from "@/types";

export type MapPoint = {
  id: string;
  protocol: string;
  title: string;
  neighborhood: string;
  status: RequestStatus;
  latitude: string;
  longitude: string;
  category: string;
  categoryColor: string;
};

const RequestsMapCanvas = dynamic(
  () =>
    import("@/components/map/requests-map-canvas").then(
      (module) => module.RequestsMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[620px] place-items-center bg-slate-100 text-sm text-slate-500">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando mapa...
        </span>
      </div>
    ),
  },
);

export function RequestsMap() {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const located = (data.items as MapPoint[]).filter((item) => {
        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);
        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -22.9 &&
          latitude <= -22.6 &&
          longitude >= -43.9 &&
          longitude <= -43.5
        );
      });
      setPoints(located);
      setSelectedId((current) =>
        located.some((item) => item.id === current)
          ? current
          : (located[0]?.id ?? ""),
      );
      setLastUpdatedAt(new Date());
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar o mapa.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = window.setInterval(() => void load(true), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const selected = useMemo(
    () => points.find((point) => point.id === selectedId) ?? points[0],
    [points, selectedId],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          points.map((point) => [point.category, point.categoryColor]),
        ).entries(),
      ),
    [points],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
          {categories.map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {name}
            </span>
          ))}
          {!categories.length && (
            <span>A legenda aparecerá quando houver pontos no mapa.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdatedAt && (
            <span className="text-xs text-slate-500">
              Atualizado às{" "}
              {lastUpdatedAt.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Atualizar
          </Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="size-4 text-cyan-700" /> Ocorrências
              georreferenciadas
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                {points.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[620px] space-y-2 overflow-y-auto p-3">
            {error && <p className="p-3 text-sm text-rose-700">{error}</p>}
            {points.map((point) => (
              <button
                key={point.id}
                onClick={() => setSelectedId(point.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === point.id ? "border-cyan-300 bg-cyan-50" : "bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-slate-500">
                    {point.protocol}
                  </span>
                  <StatusBadge status={point.status} />
                </div>
                <p className="mt-2 text-sm font-medium">{point.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: point.categoryColor }}
                  />
                  {point.category}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="size-3" /> {point.neighborhood}
                </p>
              </button>
            ))}
            {!points.length && !error && !loading && (
              <p className="p-8 text-center text-sm text-slate-500">
                Nenhuma solicitação possui coordenadas válidas.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden py-0 shadow-none">
          <div className="relative min-h-[620px] bg-slate-100">
            <RequestsMapCanvas
              points={points}
              selectedId={selected?.id ?? ""}
              onSelect={setSelectedId}
            />
            {selected && (
              <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur sm:right-auto sm:max-w-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{selected.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.protocol} · {selected.category} ·{" "}
                      {selected.neighborhood}
                    </p>
                  </div>
                  <Link
                    href={`/solicitacoes/${selected.id}`}
                    className="text-sm font-medium text-cyan-700"
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
