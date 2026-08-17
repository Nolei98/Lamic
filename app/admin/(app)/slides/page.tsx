import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteProjectAction, togglePublishAction } from "@/app/actions/projects";
import { NovoProjetoForm } from "./novo-projeto-form";

export default async function SlidesPage() {
  const projetos = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { slides: true },
  });

  return (
    <div>
      <div className="admin-topo">
        <h1>Slides &amp; Banners</h1>
      </div>

      <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Novo projeto</h2>
        <NovoProjetoForm />
      </div>

      {projetos.length === 0 ? (
        <p style={{ color: "var(--txt-2)" }}>Nenhum projeto criado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {projetos.map((p) => (
            <div className="card" key={p.id}>
              <b>{p.name}</b>
              <p style={{ fontSize: 12.5, color: "var(--txt-2)", margin: "4px 0 12px" }}>
                {p.width}×{p.height}px · {p.slides.length} slide(s) · {p.published ? "Publicado" : "Rascunho"}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Link className="btn pequeno" href={`/admin/slides/${p.id}`}>
                  Editar
                </Link>
                {p.published && (
                  <a className="btn ghost pequeno" href={`/vitrine/${p.slug}`} target="_blank" rel="noreferrer">
                    Ver publicado
                  </a>
                )}
                <form action={togglePublishAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn ghost pequeno" type="submit">
                    {p.published ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <form action={deleteProjectAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn perigo pequeno" type="submit">
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
