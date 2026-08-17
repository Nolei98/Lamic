import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NovoUsuarioForm } from "./novo-usuario-form";
import { LinhaUsuario } from "./linha-usuario";

export default async function UsuariosPage() {
  const [usuarios, session] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getSession(),
  ]);

  return (
    <div>
      <div className="admin-topo">
        <h1>Usuários</h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <LinhaUsuario key={u.id} usuario={u} souEu={u.id === session?.userId} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Adicionar usuário</h2>
        <p style={{ color: "var(--txt-2)", fontSize: 13.5, marginTop: -6 }}>
          Não existe cadastro público — novas contas só são criadas por aqui, por um administrador logado.
        </p>
        <NovoUsuarioForm />
      </div>
    </div>
  );
}
