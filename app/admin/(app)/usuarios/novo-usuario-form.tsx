"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useEffect } from "react";
import { createUserAction } from "@/app/actions/users";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ marginTop: 16 }}>
      {pending ? "Salvando…" : "Criar usuário"}
    </button>
  );
}

export function NovoUsuarioForm() {
  const [state, formAction] = useFormState(createUserAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form className="form" action={formAction} ref={formRef}>
      {state?.error && <p className="erro">{state.error}</p>}
      {state?.ok && <p className="aviso-ok">Usuário criado.</p>}
      <label htmlFor="name">Nome</label>
      <input id="name" name="name" required />
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required />
      <label htmlFor="password">Senha</label>
      <input id="password" name="password" type="password" minLength={8} required />
      <label htmlFor="role">Papel</label>
      <select id="role" name="role" defaultValue="EDITOR">
        <option value="EDITOR">Editor</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Botao />
    </form>
  );
}
