"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  return session;
}

export async function createUserAction(_prevState: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "EDITOR");

  if (!name || !email || !password) return { error: "Preencha nome, e-mail e senha." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) return { error: "Já existe um usuário com esse e-mail." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role: role === "ADMIN" ? "ADMIN" : "EDITOR" } });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  if (id === session.userId) throw new Error("Você não pode excluir a própria conta.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

export async function updateUserAction(_prevState: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "EDITOR");
  const password = String(formData.get("password") || "");

  if (!name) return { error: "Informe o nome." };

  const data: { name: string; role: "ADMIN" | "EDITOR"; passwordHash?: string } = {
    name,
    role: role === "ADMIN" ? "ADMIN" : "EDITOR",
  };
  if (password) {
    if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}
