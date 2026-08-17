"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/slides", label: "Slides & Banners" },
  { href: "/admin/seo", label: "Métricas de SEO" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export function AdminNav() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button className="nav-toggle" onClick={() => setAberto(true)} aria-label="Abrir menu">
        <svg width="18" height="13" viewBox="0 0 20 14" fill="none">
          <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      {aberto && <div className="nav-backdrop" onClick={() => setAberto(false)} />}

      <nav className={`admin-nav ${aberto ? "aberto" : ""}`}>
        <div className="marca">
          LAMIC<span style={{ color: "var(--turq)" }}>.</span> Painel
          <button className="nav-fechar" onClick={() => setAberto(false)} aria-label="Fechar menu">
            ×
          </button>
        </div>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname?.startsWith(l.href) ? "ativo" : ""} onClick={() => setAberto(false)}>
            {l.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button className="btn sair" type="submit">
            Sair
          </button>
        </form>
      </nav>
    </>
  );
}
