import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

const handler = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: { email: {}, password: {} },
            async authorize(creds) {
                if (!creds?.email || !creds?.password) return null;
                const user = await prisma.user.findUnique({ where: { email: String(creds.email) } });
                if (!user || !user.passwordHash) return null;
                const ok = await compare(String(creds.password), user.passwordHash);
                return ok ? { id: user.id, email: user.email, name: user.name ?? undefined } : null;
            },
        }),
    ],
    session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };
