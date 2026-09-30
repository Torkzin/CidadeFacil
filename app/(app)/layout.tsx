import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "CidadeFácil Gestão", template: "%s | CidadeFácil Gestão" },
  description: "Gestão institucional de solicitações e serviços municipais.",
  manifest: "/manifest-gestao.webmanifest",
  applicationName: "CidadeFácil Gestão",
  icons: { apple: "/icons/gestao/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CidadeFácil Gestão" },
};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
