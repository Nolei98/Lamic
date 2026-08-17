"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { deleteUserAction, updateUserAction } from "@/app/actions/users";

type Usuario = { id: string; name: string; email: string; role: string; createdAt: Date };

export function LinhaUsuario({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const [editando, setEditando] = useState(false);
  const [state, formAction] = useFormState(updateUserAction, undefined);

  return (
    <>
      <tr>
        <td>{usuario.name}</td>
        <td>{usuario.email}</td>
        <td>{usuario.role === "ADMIN" ? "Admin" : "Editor"}</td>
        <td>{new Date(usuario.createdAt).toLocaleDateString("pt-BR")}</td>
        <td style={{ display: "flex", gap: 6 }}>
          <button className="btn ghost pequeno" onClick={() => setEditando((v) => !v)}>
            {editando ? "Fechar" : "Editar"}
          </button>
          {!souEu && (
            <form action={deleteUserAction}>
              <input type="hidden" name="id" value={usuario.id} />
              <button className="btn perigo pequeno" type="submit">
                Excluir
              </button>
            </form>
          )}
        </td>
      </tr>
      {editando && (
        <tr>
          <td colSpan={5}>
            <form className="form" action={formAction} style={{ maxWidth: 380 }}>
              <input type="hidden" name="id" value={usuario.id} />
              {state?.error && <p className="erro">{state.error}</p>}
              {state?.ok && <p className="aviso-ok">Atualizado.</p>}
              <div className="campo-inline">
                <div>
                  <label>Nome</label>
                  <input name="name" defaultValue={usuario.name} required />
                </div>
                <div>
                  <label>Papel</label>
                  <select name="role" defaultValue={usuario.role}>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <label>Nova senha (deixe em branco para manter)</label>
              <input name="password" type="password" minLength={8} />
              <button className="btn pequeno" type="submit" style={{ marginTop: 12 }}>
                Salvar
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
