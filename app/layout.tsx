import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CidadeFácil", template: "%s | CidadeFácil" },
  description: "Plataforma inteligente para gestão de solicitações e serviços municipais.",
  icons: { icon: "/favicon.svg", apple: "/icons/gestao/apple-touch-icon.png" },
  manifest: "/manifest-gestao.webmanifest",
  applicationName: "CidadeFácil Gestão",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CidadeFácil Gestão" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
