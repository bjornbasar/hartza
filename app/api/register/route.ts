import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
	try {
		const { email, password, name } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password required" },
				{ status: 400 }
			);
		}

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json(
				{ error: "Email already in use" },
				{ status: 409 }
			);
		}

		const passwordHash = await hash(String(password), 12);
		const user = await prisma.user.create({
			data: { email, name: name ?? null, passwordHash },
		});

		return NextResponse.json({
			ok: true,
			user: { id: user.id, email: user.email },
		});
	} catch (e) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
}
