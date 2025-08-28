import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Redirect unauthenticated users to /login
export default withAuth(
    function middleware(_req) {
        return NextResponse.next();
    },
    {
        pages: { signIn: "/login" } // where to send unauthenticated users
    }
);

// Protect everything except: NextAuth routes, login/register, static assets, and Next.js internals
export const config = {
    matcher: [
        // run on all paths except the ones in the negative lookahead
        "/((?!api/auth|api/register|login|register|_next/static|_next/image|favicon.ico|assets|images|public).*)",
    ],
};
