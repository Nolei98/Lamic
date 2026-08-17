import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Player } from "./player";

export default async function VitrinePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { embed?: string };
}) {
  const project = await prisma.project.findUnique({
    where: { slug: params.slug },
    include: { slides: { orderBy: { order: "asc" }, include: { layers: { orderBy: { order: "asc" } } } } },
  });

  if (!project || !project.published) notFound();

  const parsed = {
    ...project,
    slides: project.slides.map((s) => ({
      ...s,
      background: s.background ? JSON.parse(s.background) : null,
      layers: s.layers.map((l) => ({
        ...l,
        content: JSON.parse(l.content),
        responsive: l.responsive ? JSON.parse(l.responsive) : {},
      })),
    })),
  };

  // ?embed=1 é o modo usado dentro do <iframe> do site institucional (public/index.html):
  // sem moldura, sem fundo cinza, ocupando 100% do espaço — pra ficar "costurado" na página.
  const embed = searchParams?.embed === "1";

  if (embed) {
    return <Player project={JSON.parse(JSON.stringify(parsed))} fill />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f7fb", padding: 20 }}>
      <Player project={JSON.parse(JSON.stringify(parsed))} />
    </div>
  );
}
