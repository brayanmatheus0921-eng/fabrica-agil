import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, TEST_ACCESS_CODE } from "@/core/auth-config";
import { prisma } from "@/lib/prisma";

export { AUTH_COOKIE_NAME, TEST_ACCESS_CODE };
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteAuthSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(AUTH_COOKIE_NAME);
}

export const getAuthContext = cache(async () => {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            include: { company: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) return null;
  const membership = session.user.memberships[0];
  if (!membership) return null;

  return {
    sessionId: session.id,
    userId: session.user.id,
    userName: session.user.name ?? session.user.email,
    email: session.user.email,
    membershipId: membership.id,
    companyId: membership.companyId,
    company: membership.company,
    role: membership.role,
  };
});

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}
