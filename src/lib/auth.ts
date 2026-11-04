import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "talentlens_session";
const JWT_SECRET = process.env.JWT_SECRET;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "RECRUITER" | "CLIENT";
  clientCompanyId: string | null;
}

function secret(): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }
  return JWT_SECRET;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
