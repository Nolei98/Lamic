"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ from }: { from: string }) {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <form className="form" action={formAction}>
      <input type="hidden" name="from" value={from} />
      {state?.error && <p className="erro">{state.error}</p>}
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="username" placeholder="voce@lamic.com.br" />
      <label htmlFor="password">Senha</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      <BotaoEntrar />
    </form>
  );
}
