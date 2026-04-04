import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function summarizeDatabaseUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return { configured: false as const };
  }
  try {
    const parsed = new URL(databaseUrl);
    return {
      configured: true as const,
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: parsed.port || "(default)",
      database: parsed.pathname.replace(/^\//, "") || "(unknown)"
    };
  } catch {
    return { configured: true as const, invalid: true as const };
  }
}

export async function checkDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false as const, message };
  }
}

export async function checkDbSchema() {
  try {
    await prisma.user.count();
    return { ok: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false as const, message };
  }
}
