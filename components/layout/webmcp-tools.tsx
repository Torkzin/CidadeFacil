"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown | Promise<unknown>;
};

type ModelContext = {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): void | Promise<void>;
};

function modelContext() {
  return (document as Document & { modelContext?: ModelContext }).modelContext;
}

export function WebMcpTools() {
  const router = useRouter();
  useEffect(() => {
    const context = modelContext();
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    void register({
      name: "find_municipal_requests",
      title: "Buscar solicitações municipais",
      description: "Busca solicitações reais por protocolo, título ou bairro e retorna os registros correspondentes.",
      inputSchema: { type: "object", properties: { query: { type: "string", minLength: 2 } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const query = typeof input === "object" && input !== null && "query" in input ? String(input.query).trim() : "";
        if (query.length < 2) throw new Error("A busca precisa ter pelo menos dois caracteres.");
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Não foi possível consultar as solicitações.");
        const data = await response.json() as { items: Array<{ id: string; type: string; title: string; subtitle: string; href: string }> };
        return data.items.filter((item) => item.type === "Solicitação").slice(0, 8);
      },
    });
    void register({
      name: "start_request_creation",
      title: "Iniciar nova solicitação",
      description: "Abre o formulário visível para registrar uma nova solicitação municipal.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        router.push("/solicitacoes/nova");
        return { status: "ready", route: "/solicitacoes/nova" };
      },
    });
    return () => lifecycle.abort();
  }, [router]);
  return null;
}
