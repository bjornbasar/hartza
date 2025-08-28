import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: { email: {}, password: {} },
            async authorize(creds) {
                if (!creds?.email || !creds?.password) return null;
                const user = await prisma.user.findUnique({ where: { email: String(creds.email) } });
                if (!user || !user.passwordHash) return null;
                const ok = await compare(String(creds.password), user.passwordHash);
                if (!ok) return null;
                return { id: user.id, email: user.email, name: user.name ?? undefined };
            }
        })
    ],
    session: { strategy: "jwt" }, // JWT session cookie
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.uid = user.id; // persist user id
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token?.uid) session.user.id = token.uid;
            return session;
        }
    },
    // optional: customize maxAge, pages, etc.
    // session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
