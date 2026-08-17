"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function createMetricAction(_prevState: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");

  const source = String(formData.get("source") || "manual");
  const metric = String(formData.get("metric") || "").trim();
  const value = Number(formData.get("value"));
  const date = String(formData.get("date") || "");

  if (!metric || Number.isNaN(value) || !date) return { error: "Preencha métrica, valor e data." };

  await prisma.metricSnapshot.create({ data: { source, metric, value, date: new Date(date) } });
  revalidatePath("/admin/seo");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
