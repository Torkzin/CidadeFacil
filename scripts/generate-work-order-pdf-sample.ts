import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createWorkOrderPdf } from "../lib/work-orders/pdf";

async function sampleImage(background: string, label: string) {
  const svg = `<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="600" fill="${background}"/><circle cx="450" cy="250" r="105" fill="#ffffff" opacity="0.22"/><text x="450" y="275" text-anchor="middle" font-family="Arial" font-size="58" font-weight="bold" fill="#ffffff">${label}</text><text x="450" y="355" text-anchor="middle" font-family="Arial" font-size="26" fill="#ffffff">Imagem ilustrativa para validação</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
const generatedAt = new Date();
const pdf = await createWorkOrderPdf({
  municipality: { governmentName: "Prefeitura Municipal de Seropédica", taxId: "01.604.139/0001-07", phone: "(21) 2682-2227", address: "Rua Maria Lourenço, 18 - Fazenda Caxias - CEP 23895-295", email: "prefeito@seropedica.rj.gov.br" },
  order: { number: "OS-2026-AMOSTRA", status: "Concluída", plannedAt: new Date("2026-09-23T09:00:00-03:00"), startedAt: new Date("2026-09-23T09:18:00-03:00"), completedAt: new Date("2026-09-23T11:42:00-03:00"), notes: "Realizar vistoria, sinalizar a área e executar o serviço conforme as normas da secretaria.", completionNote: "Serviço executado, área limpa e funcionamento verificado pela equipe responsável.", createdAt: generatedAt },
  request: { protocol: "2026-0000004", title: "Manutenção de serviço urbano", description: "Solicitação usada para demonstrar o documento institucional gerado pelo CidadeFácil.", priority: "Normal", address: "Rua Rita Batista", addressNumber: "120", complement: null, neighborhood: "Campo Lindo", citizenName: "Cidadão de demonstração" },
  assignment: { category: "Serviços Públicos", department: "Secretaria Municipal de Transporte e Serviços Públicos", team: "Equipe de Limpeza Urbana", assignee: "Responsável de campo" },
  materials: [{ description: "Saco reforçado para resíduos", quantity: "12", unit: "un" }, { description: "Cone de sinalização", quantity: "4", unit: "un" }, { description: "Combustível para equipamento", quantity: "5", unit: "L" }],
  evidence: [
    { phase: "Antes", originalName: "evidencia-antes.png", image: await sampleImage("#475569", "ANTES") },
    { phase: "Depois", originalName: "evidencia-depois.png", image: await sampleImage("#0e7490", "DEPOIS") },
  ],
  signatures: [
    { role: "Execução", signerName: "Responsável de campo", signerRole: "Equipe de campo", statement: "Confirmo que as informações, materiais e evidências registradas correspondem ao serviço executado.", signedAt: new Date("2026-09-23T11:45:00-03:00") },
    { role: "Fiscalização", signerName: "Gestor responsável", signerRole: "Gestor", statement: "Homologo a execução registrada nesta ordem de serviço após análise das informações e evidências.", signedAt: new Date("2026-09-23T14:10:00-03:00") },
  ],
  generatedAt,
});

const outputDir = path.join(process.cwd(), "output", "pdf");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "ordem-servico-cidadefacil.pdf");
await writeFile(outputPath, pdf);
console.log(outputPath);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
