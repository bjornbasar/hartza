import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!login|register|api/auth|api/register|_next|images|favicon\\.ico|manifest\\.webmanifest).*)',
  ],
}
