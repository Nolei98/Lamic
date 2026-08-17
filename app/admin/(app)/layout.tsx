import { getSession } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // Login não usa esse shell (tem layout próprio de tela cheia).
  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">
        {session && (
          <div className="admin-topo">
            <div />
            <div className="quem">
              {session.name} · {session.email}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
