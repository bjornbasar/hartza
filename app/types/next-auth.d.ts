// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }

    // Optional: if you want `user.id` typed where NextAuth gives you a User
    interface User {
        id: string;
        email: string;
        name?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        uid?: string;
    }
}
