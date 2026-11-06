import { prisma } from "./db";

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  meta?: object
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (error) {
    // Audit logging is secondary to the action it records — a broken
    // trail entry (e.g. a stale session referencing a deleted user)
    // must never surface as a 500 and block the primary mutation.
    console.error("logAudit failed", { userId, action, entityType, entityId }, error);
  }
}
