"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublicRequestLookup() {
  const router = useRouter(); const [protocol, setProtocol] = useState(""); const [token, setToken] = useState("");
  function submit(event: React.FormEvent) { event.preventDefault(); const normalized = protocol.trim().toUpperCase(); if (!normalized || !token.trim()) return; sessionStorage.setItem(`cidadefacil:${normalized}`, token.trim()); router.push(`/cidadao/protocolo/${encodeURIComponent(normalized)}`); }
  return <Card className="mt-8 shadow-sm"><CardContent className="p-6"><form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label htmlFor="protocol">Protocolo</Label><Input id="protocol" required placeholder="2026-0000001" autoCapitalize="characters" value={protocol} onChange={(event) => setProtocol(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="publicToken">Código de acompanhamento</Label><Input id="publicToken" required autoComplete="off" placeholder="Código entregue após o cadastro" value={token} onChange={(event) => setToken(event.target.value)} /><p className="text-xs leading-5 text-slate-500">Este código protege seus dados contra consultas por terceiros.</p></div><Button type="submit" className="w-full bg-cyan-800 hover:bg-cyan-900"><Search className="size-4" /> Consultar</Button></form></CardContent></Card>;
}

