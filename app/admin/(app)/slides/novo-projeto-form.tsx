"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProjectAction } from "@/app/actions/projects";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ marginTop: 16 }}>
      {pending ? "Criando…" : "Criar projeto"}
    </button>
  );
}

export function NovoProjetoForm() {
  const [state, formAction] = useFormState(createProjectAction, undefined);

  return (
    <form className="form" action={formAction}>
      {state?.error && <p className="erro">{state.error}</p>}
      <label htmlFor="name">Nome do projeto</label>
      <input id="name" name="name" required placeholder="Ex: Banner Home — Vacinas" />
      <div className="campo-inline">
        <div>
          <label htmlFor="width">Largura (px)</label>
          <input id="width" name="width" type="number" defaultValue={1200} />
        </div>
        <div>
          <label htmlFor="height">Altura (px)</label>
          <input id="height" name="height" type="number" defaultValue={500} />
        </div>
      </div>
      <Botao />
    </form>
  );
}
