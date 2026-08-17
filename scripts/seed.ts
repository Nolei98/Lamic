import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@lamic.com.br").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "troque-esta-senha";
  const name = process.env.ADMIN_NAME || "Admin";

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário admin já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name, passwordHash, role: "ADMIN" } });
  console.log(`Usuário admin criado: ${email} / senha definida em ADMIN_PASSWORD (.env)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
