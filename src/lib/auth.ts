import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me-please-32+chars",
);

const TTL_HOURS = Number(process.env.AUTH_SESSION_TTL_HOURS ?? "12");

export const SESSION_COOKIE = "acp_session";

export interface SessionPayload {
  sub: string; // userId
  jti: string; // session id (revocable)
  type: string; // PLATFORM | SUBSCRIBER | CANDIDATE
  sid: string | null; // subscriberId
}

// ----------------------- Passwords -----------------------

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ----------------------- Tokens -----------------------

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(SECRET);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: String(payload.sub),
      jti: String(payload.jti),
      type: String(payload.type),
      sid: (payload.sid as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
}
