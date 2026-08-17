"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useEffect } from "react";
import { createMetricAction } from "@/app/actions/metrics";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending} style={{ marginTop: 16 }}>
      {pending ? "Salvando…" : "Registrar"}
    </button>
  );
}

export function NovaMetricaForm() {
  const [state, formAction] = useFormState(createMetricAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form className="form" action={formAction} ref={formRef}>
      {state?.error && <p className="erro">{state.error}</p>}
      {state?.ok && <p className="aviso-ok">Registrado.</p>}
      <label htmlFor="source">Origem</label>
      <select id="source" name="source" defaultValue="manual">
        <option value="manual">Manual</option>
        <option value="search_console">Google Search Console</option>
        <option value="analytics">Google Analytics</option>
        <option value="google_ads">Google Ads</option>
      </select>
      <label htmlFor="metric">Métrica (ex: cliques, sessões, conversões)</label>
      <input id="metric" name="metric" required />
      <label htmlFor="value">Valor</label>
      <input id="value" name="value" type="number" step="any" required />
      <label htmlFor="date">Data</label>
      <input id="date" name="date" type="date" required />
      <Botao />
    </form>
  );
}
