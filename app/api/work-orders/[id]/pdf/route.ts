import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { categories, departments, municipalitySettings, requests, teams, users, workOrderAttachments, workOrderMaterials, workOrders, workOrderSignatures } from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestAccessCondition } from "@/lib/server/permissions";
import { readUpload } from "@/lib/storage/local";
import { createWorkOrderPdf } from "@/lib/work-orders/pdf";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await context.params;
  const [item] = await db.select({
    order: workOrders,
    protocol: requests.protocol, title: requests.title, description: requests.description, priority: requests.priority,
    address: requests.address, addressNumber: requests.addressNumber, complement: requests.complement, neighborhood: requests.neighborhood, citizenName: requests.citizenName,
    category: categories.name, department: departments.name, team: teams.name, assignee: users.name,
    governmentName: municipalitySettings.governmentName, taxId: municipalitySettings.taxId, phone: municipalitySettings.phone, governmentAddress: municipalitySettings.address, email: municipalitySettings.email,
  }).from(workOrders)
    .innerJoin(requests, eq(workOrders.requestId, requests.id))
    .innerJoin(categories, eq(requests.categoryId, categories.id))
    .innerJoin(municipalitySettings, eq(workOrders.municipalityId, municipalitySettings.municipalityId))
    .leftJoin(departments, eq(workOrders.departmentId, departments.id))
    .leftJoin(teams, eq(workOrders.teamId, teams.id))
    .leftJoin(users, eq(workOrders.assignedToId, users.id))
    .where(and(eq(workOrders.id, id), requestAccessCondition(user))).limit(1);
  if (!item) return apiError("Ordem de serviço não encontrada.", 404);

  const [materials, attachments, signatures] = await Promise.all([
    db.select({ description: workOrderMaterials.description, quantity: workOrderMaterials.quantity, unit: workOrderMaterials.unit }).from(workOrderMaterials).where(eq(workOrderMaterials.workOrderId, id)),
    db.select().from(workOrderAttachments).where(eq(workOrderAttachments.workOrderId, id)).orderBy(workOrderAttachments.createdAt),
    db.select({ role: workOrderSignatures.role, signerName: workOrderSignatures.signerName, signerRole: workOrderSignatures.signerRole, statement: workOrderSignatures.statement, signedAt: workOrderSignatures.signedAt }).from(workOrderSignatures).where(eq(workOrderSignatures.workOrderId, id)).orderBy(workOrderSignatures.signedAt),
  ]);
  const evidence = await Promise.all(attachments.map(async (attachment) => {
    const stored = await readUpload(attachment.storageKey);
    const image = attachment.contentType === "image/webp" ? await sharp(stored).png().toBuffer() : stored;
    return { phase: attachment.phase, originalName: attachment.originalName, image };
  }));
  const pdf = await createWorkOrderPdf({
    municipality: { governmentName: item.governmentName, taxId: item.taxId, phone: item.phone, address: item.governmentAddress, email: item.email },
    order: item.order,
    request: { protocol: item.protocol, title: item.title, description: item.description, priority: item.priority, address: item.address, addressNumber: item.addressNumber, complement: item.complement, neighborhood: item.neighborhood, citizenName: item.citizenName },
    assignment: { category: item.category, department: item.department, team: item.team, assignee: item.assignee },
    materials, evidence, signatures, generatedAt: new Date(),
  });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "work_order.pdf_generated", entityType: "work_order", entityId: id, metadata: { number: item.order.number } });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${item.order.number}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
