import { prisma } from "./db";

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  meta?: object
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}
