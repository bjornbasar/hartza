import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          householdId: user.householdId,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.householdId = (user as any).householdId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.householdId = token.householdId as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
})
