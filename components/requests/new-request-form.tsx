"use client";

import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  FileImage,
  Info,
  Loader2,
  MapPin,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  SEROPEDICA,
  SEROPEDICA_NEIGHBORHOODS,
  SEROPEDICA_NEIGHBORHOOD_NAMES,
} from "@/lib/municipality/seropedica";
import { geocodeSeropedicaAddress } from "@/lib/municipality/geocode-client";
import { DuplicateWarningDialog, type DuplicateWarningItem } from "@/components/requests/duplicate-warning-dialog";

function FieldSelect({
  placeholder,
  options,
  value,
  onValueChange,
}: {
  placeholder: string;
  options: readonly string[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NewRequestForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locatedAddress, setLocatedAddress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateWarningItem[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Normal",
    address: "",
    addressNumber: "",
    complement: "",
    neighborhood: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    department: "",
    team: "",
  });
  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });
  const choose = (name: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((response) => response.json()),
      fetch("/api/departments").then((response) => response.json()),
      fetch("/api/teams").then((response) => response.json()),
    ])
      .then(([categoryData, departmentData, teamData]) => {
        setCategories(
          (categoryData.items ?? []).map((item: { name: string }) => item.name),
        );
        setDepartments(
          (departmentData.items ?? []).map(
            (item: { name: string }) => item.name,
          ),
        );
        setTeams(
          (teamData.items ?? []).map((item: { name: string }) => item.name),
        );
      })
      .catch(() =>
        toast.error("Não foi possível carregar secretarias e equipes."),
      );
  }, []);
  const postalRange =
    SEROPEDICA_NEIGHBORHOODS.find((item) => item.name === form.neighborhood)
      ?.postalCodeRange ?? SEROPEDICA.postalCodeRange;
  const mapSrc =
    form.latitude && form.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=-43.86%2C-22.88%2C-43.54%2C-22.66&marker=${form.latitude}%2C${form.longitude}`
      : "https://www.openstreetmap.org/export/embed.html?bbox=-43.86%2C-22.88%2C-43.54%2C-22.66";

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
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json();
      if (!response.ok)
        throw new Error(
          responsePayload.error ?? "Não foi possível criar a solicitação.",
        );
      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("files", file));
        const uploadResponse = await fetch(
          `/api/requests/${responsePayload.protocol}/attachments`,
          { method: "POST", body: upload },
        );
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok)
          toast.warning(
            "Solicitação criada, mas as fotos não foram enviadas.",
            { description: uploadPayload.error },
          );
      }
      toast.success("Solicitação criada com sucesso.", {
        description: `Protocolo ${responsePayload.protocol} gerado.`,
      });
      router.push(`/solicitacoes/${responsePayload.protocol}`);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const location = await searchAddress(false);
      const payload = { ...form, latitude: location.latitude, longitude: location.longitude };
      const similarResponse = await fetch("/api/requests/similar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const similar = await similarResponse.json();
      if (!similarResponse.ok) throw new Error(similar.error ?? "Não foi possível verificar reincidências.");
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
          : "Não foi possível criar a solicitação.",
      );
      setSubmitting(false);
    }
  }
  return (
    <>
    <form
      onSubmit={submit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Informações da solicitação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Descreva a ocorrência com o máximo de clareza.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                required
                placeholder="Ex.: Poste sem iluminação na Rua das Flores"
                className="h-10"
                {...field("title")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="description"
                required
                placeholder="Informe detalhes que ajudem a equipe no atendimento..."
                className="min-h-32 resize-y"
                {...field("description")}
              />
              <p className="text-xs text-slate-400">
                Inclua referências do local e há quanto tempo o problema ocorre.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Categoria <span className="text-rose-500">*</span>
                </Label>
                <FieldSelect
                  placeholder="Selecione uma categoria"
                  options={categories}
                  value={form.category}
                  onValueChange={choose("category")}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Prioridade <span className="text-rose-500">*</span>
                </Label>
                <FieldSelect
                  placeholder="Selecione a prioridade"
                  options={["Baixa", "Normal", "Alta", "Urgente"]}
                  value={form.priority}
                  onValueChange={choose("priority")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-cyan-700" /> Localização
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe o endereço; o sistema localizará o ponto automaticamente
              em Seropédica.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label htmlFor="address">
                  Endereço <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="address"
                  required
                  placeholder="Rua, avenida ou praça"
                  {...field("address")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  placeholder="S/N"
                  {...field("addressNumber")}
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  placeholder="Próximo a..."
                  {...field("complement")}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Bairro <span className="text-rose-500">*</span>
                </Label>
                <FieldSelect
                  placeholder="Selecione"
                  options={SEROPEDICA_NEIGHBORHOOD_NAMES}
                  value={form.neighborhood}
                  onValueChange={choose("neighborhood")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  inputMode="numeric"
                  placeholder="23890-000"
                  {...field("postalCode")}
                />
                <p className="text-xs text-slate-400">Faixa: {postalRange}</p>
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
            <div className="relative h-64 overflow-hidden rounded-xl border bg-slate-100">
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
                automaticamente ao criar a solicitação.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Encaminhamento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Defina os responsáveis pelo primeiro atendimento.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Secretaria responsável</Label>
              <FieldSelect
                placeholder="Selecione a secretaria"
                options={departments}
                value={form.department}
                onValueChange={choose("department")}
              />
            </div>
            <div className="space-y-2">
              <Label>Equipe responsável</Label>
              <FieldSelect
                placeholder="Selecione a equipe"
                options={teams}
                value={form.team}
                onValueChange={choose("team")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <aside className="space-y-5">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5 text-cyan-700" /> Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 text-center hover:border-cyan-400 hover:bg-cyan-50/40">
              <UploadCloud className="mb-3 size-7 text-cyan-700" />
              <span className="text-sm font-medium">
                Clique para adicionar fotos
              </span>
              <span className="mt-1 text-xs text-slate-500">
                PNG, JPG ou WEBP · até 10 MB · máximo 5
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) =>
                  setFiles(Array.from(event.target.files ?? []).slice(0, 5))
                }
              />
            </label>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <FileImage className="size-4 text-cyan-700" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((item) => item !== file),
                        )
                      }
                    >
                      <X className="size-3.5 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-cyan-100 bg-cyan-50/50 shadow-none">
          <CardContent className="flex gap-3 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-cyan-700" />
            <div>
              <p className="text-sm font-medium text-cyan-950">
                Protocolo automático
              </p>
              <p className="mt-1 text-xs leading-5 text-cyan-800">
                Ao criar, o sistema reservará o próximo protocolo do município e
                abrirá a página de acompanhamento.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="sticky top-24 shadow-none">
          <CardContent className="space-y-3 p-4">
            <Button
              type="submit"
              className="h-10 w-full bg-cyan-800 hover:bg-cyan-900"
              disabled={submitting}
            >
              {submitting ? (
                "Criando..."
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Criar solicitação
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
    <DuplicateWarningDialog open={duplicates.length > 0} items={duplicates} confirming={submitting} onReview={() => { setDuplicates([]); setPendingPayload(null); setSubmitting(false); }} onConfirm={() => { if (!pendingPayload) return; setSubmitting(true); create(pendingPayload).catch((error) => { toast.error(error instanceof Error ? error.message : "Não foi possível criar a solicitação."); setSubmitting(false); }); }} />
    </>
  );
}
