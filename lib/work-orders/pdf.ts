import PDFDocument from "pdfkit";

export type WorkOrderPdfData = {
  municipality: { governmentName: string; taxId: string; phone: string; address: string; email: string };
  order: { number: string; status: string; plannedAt: Date | null; startedAt: Date | null; completedAt: Date | null; notes: string | null; completionNote: string | null; createdAt: Date };
  request: { protocol: string; title: string; description: string; priority: string; address: string; addressNumber: string | null; complement: string | null; neighborhood: string; citizenName: string };
  assignment: { category: string; department: string | null; team: string | null; assignee: string | null };
  materials: Array<{ description: string; quantity: string; unit: string }>;
  evidence: Array<{ phase: "Antes" | "Depois"; originalName: string; image: Buffer }>;
  signatures: Array<{ role: "Execução" | "Fiscalização"; signerName: string; signerRole: string; statement: string; signedAt: Date }>;
  generatedAt: Date;
};

const cyan = "#0e7490";
const slate = "#334155";
const light = "#f1f5f9";
const border = "#cbd5e1";

const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(value)
  : "Não informado";

export async function createWorkOrderPdf(data: WorkOrderPdfData) {
  const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true, info: { Title: `${data.order.number} - Ordem de Serviço`, Author: data.municipality.governmentName, Subject: `Execução vinculada ao protocolo ${data.request.protocol}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });

  function ensureSpace(height: number) { if (doc.y + height > 760) doc.addPage(); }
  function section(title: string) { ensureSpace(44); doc.moveDown(0.7).roundedRect(46, doc.y, 503, 25, 4).fill(cyan); doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text(title.toUpperCase(), 57, doc.y + 7, { characterSpacing: 0.6 }); doc.fillColor(slate); doc.y += 31; }
  function row(label: string, value: string, x: number, y: number, width: number) { doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(label, x, y, { width }); doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(value || "Não informado", x, y + 12, { width }); }
  function paragraph(label: string, value: string | null) { ensureSpace(52); doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(label, 52, doc.y); doc.moveDown(0.35).fillColor("#0f172a").font("Helvetica").fontSize(9.5).text(value || "Não informado", 52, doc.y, { width: 491, lineGap: 2 }); doc.moveDown(0.5); }

  doc.rect(0, 0, 595.28, 112).fill(cyan);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(18).text(data.municipality.governmentName, 46, 35, { width: 330 });
  doc.font("Helvetica").fontSize(8.5).text(`CNPJ ${data.municipality.taxId}  |  ${data.municipality.phone}`, 46, 61, { width: 360 });
  doc.text(data.municipality.address, 46, 75, { width: 360 });
  doc.roundedRect(410, 30, 139, 55, 6).fill("#ecfeff");
  doc.fillColor(cyan).font("Helvetica-Bold").fontSize(9).text("ORDEM DE SERVIÇO", 422, 42, { width: 115, align: "center" });
  doc.fontSize(13).text(data.order.number, 417, 60, { width: 125, align: "center" });
  doc.y = 128;

  section("Identificação");
  let y = doc.y;
  row("PROTOCOLO DA SOLICITAÇÃO", data.request.protocol, 52, y, 150);
  row("STATUS DA OS", data.order.status, 220, y, 140);
  row("PRIORIDADE", data.request.priority, 382, y, 150);
  doc.y = y + 42;
  row("CATEGORIA", data.assignment.category, 52, doc.y, 230);
  row("CIDADÃO", data.request.citizenName, 304, doc.y, 228);
  doc.y += 45;

  section("Demanda e local de execução");
  paragraph("TÍTULO", data.request.title);
  paragraph("DESCRIÇÃO", data.request.description);
  const address = [data.request.address, data.request.addressNumber, data.request.complement].filter(Boolean).join(", ");
  paragraph("ENDEREÇO", `${address} - ${data.request.neighborhood} - Seropédica/RJ`);

  section("Responsáveis e planejamento");
  y = doc.y;
  row("SECRETARIA", data.assignment.department ?? "Não informada", 52, y, 235);
  row("EQUIPE", data.assignment.team ?? "Não informada", 304, y, 228);
  doc.y = y + 45;
  row("RESPONSÁVEL", data.assignment.assignee ?? "Não definido", 52, doc.y, 235);
  row("DATA PLANEJADA", formatDate(data.order.plannedAt), 304, doc.y, 228);
  doc.y += 45;
  y = doc.y;
  row("INÍCIO DA EXECUÇÃO", formatDate(data.order.startedAt), 52, y, 235);
  row("CONCLUSÃO", formatDate(data.order.completedAt), 304, y, 228);
  doc.y = y + 42;
  paragraph("ORIENTAÇÕES", data.order.notes);

  section("Materiais e recursos");
  ensureSpace(40);
  y = doc.y;
  doc.rect(52, y, 480, 23).fill(light);
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(8).text("DESCRIÇÃO", 61, y + 8, { width: 300 }).text("QUANTIDADE", 374, y + 8, { width: 80 }).text("UNIDADE", 467, y + 8, { width: 55 });
  doc.y = y + 23;
  const materials = data.materials.length ? data.materials : [{ description: "Nenhum material registrado", quantity: "-", unit: "-" }];
  for (const item of materials) {
    ensureSpace(28); y = doc.y; doc.moveTo(52, y + 26).lineTo(532, y + 26).strokeColor(border).stroke(); doc.fillColor("#0f172a").font("Helvetica").fontSize(9).text(item.description, 61, y + 8, { width: 300 }).text(item.quantity, 374, y + 8, { width: 80 }).text(item.unit, 467, y + 8, { width: 55 }); doc.y = y + 27;
  }

  section("Relatório de execução");
  paragraph("SERVIÇO REALIZADO", data.order.completionNote);

  for (const phase of ["Antes", "Depois"] as const) {
    ensureSpace(220);
    section(`Evidências - ${phase}`);
    const images = data.evidence.filter((item) => item.phase === phase);
    if (!images.length) { doc.fillColor("#64748b").font("Helvetica-Oblique").fontSize(9).text("Nenhuma evidência fotográfica registrada.", 52, doc.y + 4); doc.y += 28; continue; }
    for (let index = 0; index < images.length; index += 2) {
      ensureSpace(185); y = doc.y; const pair = images.slice(index, index + 2);
      pair.forEach((item, offset) => { const x = 52 + offset * 244; doc.roundedRect(x, y, 228, 158, 4).lineWidth(0.7).strokeColor(border).stroke(); try { doc.image(item.image, x + 5, y + 5, { fit: [218, 128], align: "center", valign: "center" }); } catch { doc.fillColor("#94a3b8").fontSize(8).text("Imagem indisponível", x + 20, y + 60, { width: 188, align: "center" }); } doc.fillColor(slate).font("Helvetica").fontSize(7.5).text(item.originalName, x + 8, y + 140, { width: 212, align: "center", ellipsis: true }); });
      doc.y = y + 169;
    }
  }

  section("Validação da execução");
  ensureSpace(120); y = doc.y;
  (["Execução", "Fiscalização"] as const).forEach((role, index) => {
    const x = 52 + index * 252;
    const signature = data.signatures.find((item) => item.role === role);
    doc.roundedRect(x, y, 228, 92, 5).lineWidth(0.8).strokeColor(signature ? "#6ee7b7" : border).stroke();
    doc.fillColor(signature ? "#047857" : "#64748b").font("Helvetica-Bold").fontSize(8.5).text(role === "Execução" ? "ACEITE DA EXECUÇÃO" : "HOMOLOGAÇÃO DA FISCALIZAÇÃO", x + 11, y + 11, { width: 206 });
    if (signature) {
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9.5).text(signature.signerName, x + 11, y + 31, { width: 206, ellipsis: true });
      doc.fillColor(slate).font("Helvetica").fontSize(7.5).text(`${signature.signerRole} - ${formatDate(signature.signedAt)}`, x + 11, y + 48, { width: 206 });
      doc.fillColor("#047857").font("Helvetica-Oblique").fontSize(7).text("Aceite eletrônico registrado e auditado", x + 11, y + 68, { width: 206 });
    } else {
      doc.fillColor("#94a3b8").font("Helvetica-Oblique").fontSize(8).text("Aceite ainda não registrado", x + 11, y + 42, { width: 206, align: "center" });
    }
  });
  doc.y = y + 105;

  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page += 1) {
    doc.switchToPage(page);
    doc.page.margins.bottom = 0;
    doc.moveTo(46, 806).lineTo(549, 806).strokeColor(border).stroke();
    doc.fillColor("#64748b").font("Helvetica").fontSize(7).text(`Documento gerado pelo CidadeFácil em ${formatDate(data.generatedAt)}`, 46, 814, { width: 360, lineBreak: false }).text(`Página ${page + 1} de ${range.count}`, 445, 814, { width: 104, align: "right", lineBreak: false });
  }
  doc.end();
  return completed;
}
