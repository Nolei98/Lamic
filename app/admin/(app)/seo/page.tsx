import { prisma } from "@/lib/prisma";
import { NovaMetricaForm } from "./nova-metrica-form";

export default async function SeoPage() {
  const metricas = await prisma.metricSnapshot.findMany({ orderBy: { date: "desc" }, take: 40 });

  return (
    <div>
      <div className="admin-topo">
        <h1>Métricas de SEO &amp; Marketing</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ marginTop: 0, color: "var(--txt-2)", fontSize: 14 }}>
          <b>Ainda não conectado ao Google.</b> Para puxar dados automaticamente do Search Console, Google Analytics
          (GA4) e Google Ads, é preciso criar credenciais OAuth/Service Account no Google Cloud e autorizar o acesso
          às propriedades do LAMIC — isso depende de você. Por enquanto, registre os números manualmente aqui (ex:
          exportação semanal do Search Console) para já visualizar tendências no dashboard.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Últimos registros</h2>
        {metricas.length === 0 ? (
          <p style={{ color: "var(--txt-2)", fontSize: 14 }}>Nenhuma métrica registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Origem</th>
                <th>Métrica</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => (
                <tr key={m.id}>
                  <td>{m.date.toLocaleDateString("pt-BR")}</td>
                  <td>{m.source}</td>
                  <td>{m.metric}</td>
                  <td>{m.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Registrar métrica</h2>
        <NovaMetricaForm />
      </div>
    </div>
  );
}
