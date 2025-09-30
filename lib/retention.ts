// lib/retention.ts
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

export async function runRetention(months = 12, now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);

    const r = await prisma.actualTransaction.deleteMany({
        where: {
            isGenerated: true,
            reconciled: false,
            date: { lt: cutoff },
        },
    });

    return { deleted: r.count, cutoff };
}
