import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { budgetItemSchema } from "@/lib/schemas";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const items = await prisma.budgetItem.findMany({ where: { userId: user!.id, isActive: true } });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const body = await req.json();
  const parsed = budgetItemSchema.parse(body);
  const created = await prisma.budgetItem.create({ data: { ...parsed, userId: user!.id } });
  return Response.json(created, { status: 201 });
}
