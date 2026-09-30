import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/gestao",
    name: "CidadeFácil Gestão",
    short_name: "CF Gestão",
    description: "Gestão institucional de solicitações e serviços municipais.",
    start_url: "/dashboard?origem=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#155e75",
    lang: "pt-BR",
    icons: [
      { src: "/icons/gestao/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/gestao/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/gestao/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
