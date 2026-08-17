// Parte de lib/auth.ts que precisa rodar no Edge Runtime (middleware.ts).
//
// Verificação de JWT (HS256) feita à mão com a Web Crypto API nativa, em
// vez da lib `jose`. O bundle do middleware na Vercel vinha quebrando em
// runtime com "ReferenceError: __dirname is not defined" mesmo depois de
// tirar next/headers do caminho — sinal de que a resolução do pacote
// `jose` (node vs. edge/browser build) estava saindo errada no build da
// Vercel. Web Crypto elimina essa ambiguidade: é padrão da própria
// Edge Runtime, sem resolução de pacote nenhuma envolvida.
export const SESSION_COOKIE_NAME = "lamic_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const key = await hmacKey();
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify("HMAC", key, signature.slice().buffer, data.slice().buffer);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    if (typeof payload.exp === "number" && Date.now() >= payload.exp * 1000) return null;

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
