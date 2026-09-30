import { MessageCircleMore } from "lucide-react";
import { PageHeading } from "@/components/common/page-heading";
import { WhatsAppSimulator } from "@/components/whatsapp/whatsapp-simulator";
import { WhatsAppInbox } from "@/components/whatsapp/whatsapp-inbox";
import { requireCurrentUser } from "@/lib/auth/session";
import { canAccessWhatsAppInbox } from "@/lib/whatsapp/inbox-policy";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const user = await requireCurrentUser();
  if (!canAccessWhatsAppInbox(user.role))
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-500">Seu perfil não possui acesso ao atendimento.</p>
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeading
        title="Atendimento pelo WhatsApp"
        description="Valide o fluxo que abrirá e acompanhará solicitações pelo canal oficial."
      />
      {user.role === "Administrador" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950">
          <MessageCircleMore className="mt-0.5 size-5 shrink-0" />
          <p>
            Este simulador já grava dados reais no CidadeFácil. A entrega ao WhatsApp será ativada depois com as credenciais e o webhook do parceiro homologado.
          </p>
        </div>
      )}
      <WhatsAppInbox />
      {user.role === "Administrador" && <WhatsAppSimulator />}
    </div>
  );
}
