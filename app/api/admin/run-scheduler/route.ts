// app/api/admin/run-scheduler/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { runGenerationForUser } from "@/lib/scheduler";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
        return new Response("Forbidden", { status: 403 });
    }

    // If you want write-time boundary behavior, choose a mode here:
    const boundaryMode: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | null = null;

    const users = await prisma.user.findMany({ select: { id: true } });
    const now = new Date();
    const results = [];
    for (const u of users) {
        const r = await runGenerationForUser(u.id, now, {
            backfillDays: 7,
            horizonDays: 45,
            applyBoundaryForMode: boundaryMode,
        });
        results.push({ userId: u.id, ...r });
    }
    return Response.json({ ok: true, ranAt: now.toISOString(), results });
}
