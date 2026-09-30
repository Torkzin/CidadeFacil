"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MapPin, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  mediaOriginalName: string | null;
  createdAt: string;
};

export function WhatsAppSimulator() {
  const [phone, setPhone] = useState("21999990000");
  const [displayName, setDisplayName] = useState("Cidadão de teste");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedPhone, setLoadedPhone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadConversation(targetPhone = phone) {
    if (!targetPhone.trim()) return;
    const response = await fetch(
      `/api/whatsapp/conversations?phone=${encodeURIComponent(targetPhone)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      error?: string;
      messages?: ChatMessage[];
    };
    if (!response.ok) throw new Error(data.error ?? "Conversa indisponível.");
    setMessages(data.messages ?? []);
    setLoadedPhone(targetPhone);
  }

  useEffect(() => {
    let active = true;
    const initialPhone = "21999990000";
    fetch(
      `/api/whatsapp/conversations?phone=${encodeURIComponent(initialPhone)}`,
      { cache: "no-store" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { messages?: ChatMessage[] } | null) => {
        if (active && data) {
          setMessages(data.messages ?? []);
          setLoadedPhone(initialPhone);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loadedPhone) return;
    let active = true;
    const timer = window.setInterval(() => {
      fetch(
        `/api/whatsapp/conversations?phone=${encodeURIComponent(loadedPhone)}`,
        { cache: "no-store" },
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { messages?: ChatMessage[] } | null) => {
          if (active && data) setMessages(data.messages ?? []);
        })
        .catch(() => undefined);
    }, 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadedPhone]);

  async function sendJson(payload: Record<string, unknown>) {
    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, displayName, ...payload }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Falha ao enviar mensagem.");
      await loadConversation(phone);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || loading) return;
    setText("");
    await sendJson({ type: "text", text: value });
  }

  async function uploadPhoto(file: File) {
    setLoading(true);
    try {
      const form = new FormData();
      form.set("phone", phone);
      form.set("displayName", displayName);
      form.set("file", file);
      const response = await fetch("/api/whatsapp/simulator", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Falha ao enviar foto.");
      await loadConversation(phone);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar foto.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Smartphone className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Cidadão simulado</h2>
            <p className="text-xs text-slate-500">Teste o fluxo antes da homologação</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Nome exibido</span>
            <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Número do WhatsApp</span>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
          </label>
          <Button
            variant="outline"
            className="w-full"
            disabled={loading || !phone.trim()}
            onClick={() => void loadConversation(phone).catch((error) => toast.error(error.message))}
          >
            Carregar conversa
          </Button>
        </div>
        <div className="mt-5 rounded-lg border border-cyan-100 bg-cyan-50/70 p-3 text-xs leading-5 text-cyan-900">
          Comece enviando <strong>Olá</strong>. A conversa cria solicitações reais no banco, gera protocolo e aplica as regras de encaminhamento existentes.
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-[#efeae2] shadow-sm">
        <header className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div>
            <p className="font-semibold">CidadeFácil • Seropédica</p>
            <p className="text-xs text-emerald-100">Atendimento digital</p>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">Simulador</span>
        </header>
        <div className="h-[520px] space-y-3 overflow-y-auto p-4">
          {!messages.length ? (
            <div className="mx-auto mt-8 max-w-sm rounded-lg bg-amber-50 p-3 text-center text-xs leading-5 text-amber-900 shadow-sm">
              Nenhuma mensagem para {loadedPhone || phone}. Envie “Olá” para iniciar.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === "INBOUND" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm shadow-sm ${
                    message.direction === "INBOUND"
                      ? "bg-[#d9fdd3] text-slate-900"
                      : "bg-white text-slate-900"
                  }`}
                >
                  {message.type === "image" ? (
                    <p className="flex items-center gap-2 font-medium text-emerald-800">
                      <ImagePlus className="size-4" /> Foto enviada
                      {message.mediaOriginalName ? `: ${message.mediaOriginalName}` : ""}
                    </p>
                  ) : (
                    message.body
                  )}
                  <p className="mt-1 text-right text-[10px] text-slate-400">
                    {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t bg-white p-3">
          <form onSubmit={submitMessage} className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
              title="Enviar foto"
            >
              <ImagePlus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={loading}
              onClick={() => void sendJson({ type: "location", latitude: "-22.743889", longitude: "-43.707500" })}
              title="Compartilhar localização de teste"
            >
              <MapPin className="size-4" />
            </Button>
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Digite uma mensagem"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !text.trim()} className="bg-emerald-700 hover:bg-emerald-800">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
