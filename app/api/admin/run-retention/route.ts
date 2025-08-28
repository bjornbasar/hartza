// app/api/admin/run-retention/route.ts
import { NextRequest } from "next/server";
import { runRetention } from "@/lib/retention";

export async function POST(req: NextRequest) {
    if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
        return new Response("Forbidden", { status: 403 });
    }
    const { months = 12 } = await req.json().catch(() => ({}));
    const res = await runRetention(months);
    return Response.json({ ok: true, ...res });
}
