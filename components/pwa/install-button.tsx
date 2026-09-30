"use client";

import { useEffect, useState } from "react";
import { Download, MoreVertical, Share2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppKind = "citizen" | "management";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const appNames: Record<AppKind, string> = {
  citizen: "CidadeFácil Cidadão",
  management: "CidadeFácil Gestão",
};

function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIpad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return (/iphone|ipad|ipod/.test(userAgent) || isIpad ? "ios" : /android/.test(userAgent) ? "android" : "desktop") as "ios" | "android" | "desktop";
}

export function PwaInstallButton({
  app,
  compact = false,
  className,
}: {
  app: AppKind;
  compact?: boolean;
  className?: string;
}) {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      setPlatform(detectPlatform());
      setShowHelp(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return null;

  const name = appNames[app];
  return (
    <>
      <Button
        type="button"
        variant={app === "citizen" ? "outline" : "ghost"}
        size={compact ? "icon" : "sm"}
        onClick={() => void install()}
        className={cn(
          app === "citizen"
            ? "border-cyan-200 bg-white text-cyan-900 hover:bg-cyan-50"
            : "text-slate-500 hover:text-cyan-800",
          "pwa-install-control",
          className,
        )}
        aria-label={`Instalar ${name}`}
        title={`Instalar ${name}`}
      >
        <Download className="size-4" />
        {!compact && <span>Instalar app</span>}
      </Button>

      {showHelp && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-cyan-50 text-cyan-800"><Smartphone className="size-5" /></div>
              <button type="button" onClick={() => setShowHelp(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar instruções"><X className="size-4" /></button>
            </div>
            <h2 id="pwa-install-title" className="mt-5 text-xl font-semibold">Instalar {name}</h2>
            {platform === "ios" ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">1</span><span>Toque em <strong className="text-slate-900">Compartilhar</strong> <Share2 className="mx-1 inline size-4" /> na barra do navegador.</span></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">2</span><span>Escolha <strong className="text-slate-900">Adicionar à Tela de Início</strong>.</span></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">3</span><span>Confirme em <strong className="text-slate-900">Adicionar</strong>.</span></li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">1</span><span>Abra o menu do navegador <MoreVertical className="mx-1 inline size-4" />.</span></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">2</span><span>Selecione <strong className="text-slate-900">Instalar aplicativo</strong> ou <strong className="text-slate-900">Adicionar à tela inicial</strong>.</span></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan-50 font-semibold text-cyan-800">3</span><span>Confirme a instalação do {name}.</span></li>
              </ol>
            )}
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">O navegador sempre solicita sua confirmação. Nenhum aplicativo é instalado automaticamente.</p>
          </section>
        </div>
      )}
    </>
  );
}
