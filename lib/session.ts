// Parte de lib/auth.ts que precisa rodar no Edge Runtime (middleware.ts).
// Só usa `jose` — nada de `next/headers` aqui, que puxa APIs Node e faz o
// bundle do middleware falhar no build da Vercel ("unsupported modules").
import { jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "lamic_session";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
