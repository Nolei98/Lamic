import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Editor } from "./editor";

export default async function EditorPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { slides: { orderBy: { order: "asc" }, include: { layers: { orderBy: { order: "asc" } } } } },
  });

  if (!project) notFound();

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

  return (
    <div>
      <div className="admin-topo">
        <div>
          <h1 style={{ marginBottom: 4 }}>{project.name}</h1>
          <Link href="/admin/slides" style={{ fontSize: 13, color: "var(--txt-2)" }}>
            ← Voltar para projetos
          </Link>
        </div>
        {project.published && (
          <a className="btn ghost" href={`/vitrine/${project.slug}`} target="_blank" rel="noreferrer">
            Ver publicado ↗
          </a>
        )}
      </div>
      <Editor project={JSON.parse(JSON.stringify(parsed))} />
    </div>
  );
}
