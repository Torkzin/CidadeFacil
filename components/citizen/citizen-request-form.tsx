"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, MapPin, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { geocodeSeropedicaAddress } from "@/lib/municipality/geocode-client";
import { DuplicateWarningDialog, type DuplicateWarningItem } from "@/components/requests/duplicate-warning-dialog";

type Category = { id: string; name: string };
const initial = {
  citizenName: "",
  citizenPhone: "",
  citizenEmail: "",
  categoryId: "",
  title: "",
  description: "",
  address: "",
  addressNumber: "",
  complement: "",
  neighborhood: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  privacyAccepted: false,
};

export function CitizenRequestForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locatedAddress, setLocatedAddress] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateWarningItem[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );
  useEffect(() => {
    fetch("/api/public/municipality")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => toast.error("Não foi possível carregar as categorias."));
  }, []);
  function set(name: keyof typeof initial, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function searchAddress(showSuccess = true) {
    if (!form.address.trim())
      throw new Error("Digite um endereço para pesquisar.");
    setSearching(true);
    try {
      const result = await geocodeSeropedicaAddress(form);
      setForm((current) => ({
        ...current,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      setLocatedAddress(result.displayName);
      if (showSuccess) toast.success("Endereço localizado no mapa.");
      return result;
    } finally {
      setSearching(false);
    }
  }
  async function create(payload: Record<string, unknown>) {
      const response = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Não foi possível registrar a solicitação.",
        );
      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("files", file));
        const uploadResponse = await fetch(
          `/api/public/requests/${data.protocol}/attachments`,
          {
            method: "POST",
            headers: { "X-Public-Token": data.publicToken },
            body: upload,
          },
        );
        if (!uploadResponse.ok)
          toast.warning(
            "A solicitação foi criada, mas uma ou mais fotos não foram enviadas.",
          );
      }
      sessionStorage.setItem(`cidadefacil:${data.protocol}`, data.publicToken);
      sessionStorage.setItem(`cidadefacil:new:${data.protocol}`, "1");
      router.push(`/cidadao/protocolo/${data.protocol}`);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const location = await searchAddress(false);
      const payload = { ...form, latitude: location.latitude, longitude: location.longitude };
      const similarResponse = await fetch("/api/public/requests/similar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const similar = await similarResponse.json();
      if (!similarResponse.ok) throw new Error(similar.error ?? "Não foi possível verificar solicitações semelhantes.");
      if (similar.items?.length) {
        setDuplicates(similar.items);
        setPendingPayload(payload);
        setSubmitting(false);
        return;
      }
      await create(payload);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a solicitação.",
      );
      setSubmitting(false);
    }
  }
  async function followExisting() {
    const targetId = duplicates[0]?.collectiveId;
    if (!targetId) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/requests/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          citizenName: form.citizenName,
          citizenPhone: form.citizenPhone,
          citizenEmail: form.citizenEmail,
          privacyAccepted: form.privacyAccepted,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível acompanhar a ocorrência.");
      sessionStorage.setItem(`cidadefacil:${data.protocol}`, data.publicToken);
      sessionStorage.setItem(`cidadefacil:collective:${data.protocol}`, "1");
      router.push(`/cidadao/protocolo/${data.protocol}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível acompanhar a ocorrência.");
      setSubmitting(false);
    }
  }
  const mapSrc =
    form.latitude && form.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=-43.86%2C-22.88%2C-43.54%2C-22.66&marker=${form.latitude}%2C${form.longitude}`
      : "https://www.openstreetmap.org/export/embed.html?bbox=-43.86%2C-22.88%2C-43.54%2C-22.66";
  return (
    <>
    <form onSubmit={submit} className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <p className="text-sm text-slate-500">
            Usaremos estes dados somente para o acompanhamento desta
            solicitação.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="citizenName">Nome *</Label>
            <Input
              id="citizenName"
              required
              autoComplete="name"
              value={form.citizenName}
              onChange={(e) => set("citizenName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="citizenPhone">Telefone *</Label>
            <Input
              id="citizenPhone"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="(21) 99999-9999"
              value={form.citizenPhone}
              onChange={(e) => set("citizenPhone", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="citizenEmail">E-mail (opcional)</Label>
            <Input
              id="citizenEmail"
              type="email"
              autoComplete="email"
              value={form.citizenEmail}
              onChange={(e) => set("citizenEmail", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>O que aconteceu?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select
              required
              value={
                categories.find((category) => category.id === form.categoryId)
                  ?.name ?? null
              }
              onValueChange={(value) =>
                set(
                  "categoryId",
                  categories.find((category) => category.name === value)?.id ??
                    "",
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo de serviço" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              required
              maxLength={180}
              placeholder="Ex.: Poste apagado em frente à escola"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              required
              maxLength={5000}
              className="min-h-32"
              placeholder="Explique o problema e informe referências do local."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-cyan-700" /> Localização
          </CardTitle>
          <p className="text-sm text-slate-500">
            Informe o endereço; o sistema localizará o ponto automaticamente em
            Seropédica.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                required
                placeholder="Rua, avenida ou praça"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input
                id="addressNumber"
                value={form.addressNumber}
                onChange={(e) => set("addressNumber", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={form.complement}
                onChange={(e) => set("complement", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro *</Label>
              <Select
                required
                value={form.neighborhood || null}
                onValueChange={(value) => set("neighborhood", value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SEROPEDICA_NEIGHBORHOOD_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">CEP</Label>
              <Input
                id="postalCode"
                inputMode="numeric"
                placeholder="23890-000"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                searchAddress().catch((error) =>
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível localizar o endereço.",
                  ),
                )
              }
              disabled={searching}
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}{" "}
              Localizar endereço no mapa
            </Button>
          </div>
          <div className="relative h-56 overflow-hidden rounded-xl border bg-slate-100">
            <iframe
              title="Prévia da localização encontrada"
              src={mapSrc}
              className="absolute inset-0 size-full border-0"
            />
          </div>
          {locatedAddress ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <strong>Endereço localizado:</strong> {locatedAddress}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Preencha rua, número e bairro. A localização será buscada
              automaticamente ao registrar a solicitação.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="size-5 text-cyan-700" /> Fotos
          </CardTitle>
          <p className="text-sm text-slate-500">
            Até 5 imagens JPG, PNG ou WEBP.
          </p>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-6 hover:border-cyan-400 hover:bg-cyan-50">
            <Camera className="mr-2 size-5" /> Adicionar fotos
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) =>
                setFiles(Array.from(e.target.files ?? []).slice(0, 5))
              }
            />
          </label>
          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {previews.map(({ file, url }) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="relative aspect-square overflow-hidden rounded-lg border"
                >
                  <Image
                    src={url}
                    alt={`Prévia de ${file.name}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${file.name}`}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((item) => item !== file),
                      )
                    }
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/70 text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-white p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={form.privacyAccepted}
            onCheckedChange={(value) => set("privacyAccepted", value === true)}
          />
          <span className="text-sm leading-6 text-slate-600">
            Li e concordo com o tratamento dos dados para atendimento desta
            solicitação, conforme a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="font-medium text-cyan-800 underline"
            >
              Política de Privacidade
            </Link>
            . *
          </span>
        </label>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full bg-cyan-800 hover:bg-cyan-900"
        disabled={submitting || !form.privacyAccepted}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="size-4" /> Registrar solicitação
          </>
        )}
      </Button>
    </form>
    <DuplicateWarningDialog open={duplicates.length > 0} items={duplicates} confirming={submitting} onReview={() => { setDuplicates([]); setPendingPayload(null); setSubmitting(false); }} onFollow={() => void followExisting()} onConfirm={() => { if (!pendingPayload) return; setSubmitting(true); create(pendingPayload).catch((error) => { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a solicitação."); setSubmitting(false); }); }} />
    </>
  );
}
