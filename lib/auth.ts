import { auth } from '@/auth'

export async function requireSession() {
  const session = await auth()
  if (!session?.user?.householdId) return null
  return {
    userId: session.user.id as string,
    householdId: session.user.householdId as string,
    role: session.user.role as string,
  }
}
