// Funções que só rodam em contexto Node (server actions, route handlers) —
// usam next/headers, que não é seguro pro Edge Runtime do middleware.
// A parte compartilhada com o middleware (verificação de token) mora em
// lib/session.ts.
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME as COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/session";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export type { SessionPayload };
export { verifySessionToken };

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
