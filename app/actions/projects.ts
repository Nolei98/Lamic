"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProjectAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Dê um nome ao projeto." };

  const width = Number(formData.get("width")) || 1200;
  const height = Number(formData.get("height")) || 500;

  let slug = slugify(name) || "banner";
  let n = 1;
  while (await prisma.project.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(name)}-${n}`;
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      width,
      height,
      ownerId: session.userId,
      slides: {
        create: [{ order: 0, background: JSON.stringify({ type: "color", value: "#0E2E5A" }) }],
      },
    },
  });

  revalidatePath("/admin/slides");
  redirect(`/admin/slides/${project.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  await getSession();
  const id = String(formData.get("id") || "");
  await prisma.project.delete({ where: { id } });
  revalidatePath("/admin/slides");
}

export async function togglePublishAction(formData: FormData) {
  await getSession();
  const id = String(formData.get("id") || "");
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  await prisma.project.update({ where: { id }, data: { published: !project.published } });
  revalidatePath("/admin/slides");
  revalidatePath(`/admin/slides/${id}`);
}
