import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuthSession, TEST_ACCESS_CODE } from "@/server/auth";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(4),
});

const LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function throttleKeys(request: NextRequest, email: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  return [
    createHash("sha256").update(`ip|${ip}`).digest("hex"),
    createHash("sha256").update(`email|${email}`).digest("hex"),
  ];
}

async function recordFailure(keys: string[], now: Date) {
  const blockedUntil = new Date(now.getTime() + WINDOW_MS);
  for (const key of keys) {
    await prisma.$executeRaw`
      INSERT INTO "LoginThrottle" ("key", "attempts", "windowStartedAt", "blockedUntil", "updatedAt")
      VALUES (${key}, 1, ${now}, NULL, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE
          WHEN ${now} - "LoginThrottle"."windowStartedAt" >= INTERVAL '15 minutes' THEN 1
          ELSE "LoginThrottle"."attempts" + 1
        END,
        "windowStartedAt" = CASE
          WHEN ${now} - "LoginThrottle"."windowStartedAt" >= INTERVAL '15 minutes' THEN ${now}
          ELSE "LoginThrottle"."windowStartedAt"
        END,
        "blockedUntil" = CASE
          WHEN ${now} - "LoginThrottle"."windowStartedAt" >= INTERVAL '15 minutes' THEN NULL
          WHEN "LoginThrottle"."attempts" + 1 >= ${LIMIT} THEN ${blockedUntil}
          ELSE "LoginThrottle"."blockedUntil"
        END,
        "updatedAt" = ${now}
    `;
  }
}

export async function POST(request: NextRequest) {
  const input = loginSchema.safeParse(await request.json().catch(() => null));
  const email = input.success ? input.data.email : "invalid";
  const keys = throttleKeys(request, email);
  const now = new Date();
  const throttles = await prisma.loginThrottle.findMany({ where: { key: { in: keys } } });
  if (throttles.some((throttle) => throttle.blockedUntil && throttle.blockedUntil > now)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
  }

  if (!input.success || input.data.code !== TEST_ACCESS_CODE) {
    await recordFailure(keys, now);
    return NextResponse.json({ error: "E-mail ou código incorreto." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: input.data.email },
    include: { memberships: { include: { company: true }, take: 1 } },
  });
  if (!user || user.memberships.length !== 1) {
    await recordFailure(keys, now);
    return NextResponse.json({ error: "E-mail ou código incorreto." }, { status: 401 });
  }

  await prisma.loginThrottle.deleteMany({ where: { key: { in: keys } } });
  await createAuthSession(user.id);
  const firstAccess = user.memberships[0].company.onboardingStatus !== "COMPLETED";
  return NextResponse.json({ redirectTo: firstAccess ? "/onboarding" : "/dashboard" });
}
