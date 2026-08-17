"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "/admin/dashboard");

  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "E-mail ou senha inválidos." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "E-mail ou senha inválidos." };

  await createSessionCookie({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect(from.startsWith("/admin") ? from : "/admin/dashboard");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/admin/login");
}
