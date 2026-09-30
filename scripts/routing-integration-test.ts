import { eq } from "drizzle-orm";
import { categories, departments, routingRules } from "@/db/schema";
import { db, sqlClient } from "@/lib/db/runtime";
import { resolveRoutingRule } from "@/lib/requests/routing";

async function main() {
  const [[category], [department]] = await Promise.all([
    db
      .select({ id: categories.id, municipalityId: categories.municipalityId })
      .from(categories)
      .limit(1),
    db.select({ id: departments.id }).from(departments).limit(1),
  ]);
  if (!category || !department)
    throw new Error("Cadastre uma categoria e uma secretaria antes do teste.");

  const [created] = await db
    .insert(routingRules)
    .values({
      municipalityId: category.municipalityId,
      name: "Validação automática temporária",
      categoryId: category.id,
      neighborhood: "__bairro_de_validacao__",
      departmentId: department.id,
    })
    .returning({ id: routingRules.id });
  try {
    const resolved = await resolveRoutingRule({
      municipalityId: category.municipalityId,
      categoryId: category.id,
      neighborhood: "__bairro_de_validacao__",
    });
    if (resolved?.id !== created.id)
      throw new Error("A regra temporária não foi selecionada.");
    console.log("Regra temporária criada, resolvida e validada com sucesso.");
  } finally {
    await db.delete(routingRules).where(eq(routingRules.id, created.id));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
