import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAMIC — Painel",
  description: "Painel administrativo do Laboratório LAMIC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
