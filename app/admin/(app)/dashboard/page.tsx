import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [projetos, usuarios, metricas] = await Promise.all([
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 5, include: { slides: true } }),
    prisma.user.count(),
    prisma.metricSnapshot.findMany({ orderBy: { date: "desc" }, take: 8 }),
  ]);

  const publicados = await prisma.project.count({ where: { published: true } });
  const totalProjetos = await prisma.project.count();

  return (
    <div>
      <div className="admin-topo">
        <h1>Dashboard</h1>
      </div>

      <Link href="/admin/slides" className="hero-slides">
        <div>
          <span className="tag">Módulo principal</span>
          <h2>Slides &amp; Banners</h2>
          <p>Crie e edite carrosséis e banners com camadas, animações e versões para desktop, tablet e celular.</p>
          <span className="cta-inline">
            {totalProjetos === 0 ? "Criar o primeiro projeto" : "Abrir o editor"} →
          </span>
        </div>
        <div className="hero-slides-stats">
          <div>
            <b>{totalProjetos}</b>
            <span>projetos</span>
          </div>
          <div>
            <b>{publicados}</b>
            <span>publicados</span>
          </div>
        </div>
      </Link>

      <div className="grid-stats">
        <div className="card stat">
          <b>{usuarios}</b>
          <span>Usuários do painel</span>
        </div>
        <div className="card stat">
          <b>{metricas.length}</b>
          <span>Métricas registradas</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Projetos recentes</h2>
          <Link className="btn pequeno" href="/admin/slides">
            + Novo
          </Link>
        </div>
        {projetos.length === 0 ? (
          <p style={{ color: "var(--txt-2)", fontSize: 14 }}>
            Nenhum projeto ainda. <Link href="/admin/slides">Criar o primeiro slide/banner →</Link>
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Slides</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projetos.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.slides.length}</td>
                  <td>{p.published ? "Publicado" : "Rascunho"}</td>
                  <td>{p.updatedAt.toLocaleDateString("pt-BR")}</td>
                  <td>
                    <Link className="btn ghost pequeno" href={`/admin/slides/${p.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ opacity: 0.9 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Marketing &amp; SEO</h2>
        <p style={{ color: "var(--txt-2)", fontSize: 13.5 }}>
          Resumo rápido — veja o detalhamento em <Link href="/admin/seo">Métricas de SEO</Link>. A integração
          automática com Google Search Console / Analytics / Ads ainda não está conectada; por enquanto os números
          vêm de registros manuais.
        </p>
      </div>
    </div>
  );
}
