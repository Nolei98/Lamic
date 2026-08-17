// Recria o projeto "Banner Home — Vacinas" com o conteúdo REAL que já existia
// no hero estático da home (public/index.html), pra não perder texto/CTA ao
// trocar pelo carrossel dinâmico. Rodar com: npx tsx scripts/seed-hero.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NAVY = "#0E2E5A";
const AZUL = "#123C74";

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("Nenhum usuário encontrado — rode o seed principal primeiro.");

  let project = await prisma.project.findUnique({ where: { slug: "banner-home-vacinas" } });
  if (!project) {
    project = await prisma.project.create({
      data: { name: "Banner Home — Vacinas", slug: "banner-home-vacinas", width: 1200, height: 500, ownerId: user.id },
    });
  }

  // limpa slides/camadas de teste (cascade remove as layers junto)
  await prisma.slide.deleteMany({ where: { projectId: project.id } });

  const slides = [
    {
      bg: NAVY,
      titulo: "Sua saúde em boas mãos",
      texto: "Há mais de 44 anos o LAMIC entrega resultados confiáveis para o Cariri, com mais de 1.500 exames disponíveis e 12 unidades de coleta.",
      botao: { texto: "Buscar meu exame", href: "exames.html", novaAba: false },
    },
    {
      bg: AZUL,
      titulo: "Proteção para toda a família",
      texto: "25 vacinas disponíveis, do bebê ao idoso, com tecnologias de conforto que reduzem a dor da aplicação: Buzzy®, PIKLUC e óculos de realidade virtual.",
      botao: { texto: "Ver calendário de vacinas", href: "vacinas.html", novaAba: false },
    },
    {
      bg: NAVY,
      titulo: "Resultado online, quando precisar",
      texto: "Acesse seus laudos pelo portal do paciente, a qualquer hora. Também disponível para médicos solicitantes, convênios e empresas.",
      botao: {
        texto: "Acessar resultados",
        href: "https://www.laboratoriolamic.uniexames.com.br/logins/login",
        novaAba: true,
      },
    },
  ];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    await prisma.slide.create({
      data: {
        projectId: project.id,
        order: i,
        duration: 6000,
        background: JSON.stringify({ type: "color", value: s.bg }),
        layers: {
          create: [
            {
              type: "TEXT",
              order: 0,
              x: 180,
              y: 130,
              width: 620,
              height: 110,
              content: JSON.stringify({ text: s.titulo, fontSize: 42, color: "#FFFFFF", fontWeight: 800 }),
              animationIn: "slide-up",
              delayMs: 100,
              durationMs: 600,
            },
            {
              type: "TEXT",
              order: 1,
              x: 180,
              y: 250,
              width: 560,
              height: 90,
              content: JSON.stringify({ text: s.texto, fontSize: 16, color: "#DCE8F7", fontWeight: 400 }),
              animationIn: "fade",
              delayMs: 300,
              durationMs: 600,
            },
            {
              type: "BUTTON",
              order: 2,
              x: 180,
              y: 350,
              width: 260,
              height: 52,
              content: JSON.stringify({
                text: s.botao.texto,
                href: s.botao.href,
                newTab: s.botao.novaAba,
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 700,
                gradientFrom: "#1257A5",
                gradientTo: "#2AA7BE",
                angle: 90,
                radius: 999,
              }),
              animationIn: "fade",
              delayMs: 500,
              durationMs: 600,
            },
          ],
        },
      },
    });
  }

  await prisma.project.update({ where: { id: project.id }, data: { published: true } });
  console.log(`Pronto: projeto "${project.name}" (slug: ${project.slug}) recriado com 3 slides reais e publicado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
