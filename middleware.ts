import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/((?!login|register|api/auth|api/register|_next|images|favicon\\.ico|manifest\\.webmanifest).*)',
  ],
}
