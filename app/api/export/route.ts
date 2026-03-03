import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { serializeCSV } from '@/lib/csv'
import { format } from 'date-fns'

type Fmt = 'csv' | 'json'

function respond(data: unknown, filename: string, fmt: Fmt) {
  if (fmt === 'json') {
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    })
  }
  const rows = data as Record<string, unknown>[]
  const headers = rows.length ? Object.keys(rows[0]) : []
  return new Response(serializeCSV(headers, rows), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}

export async function GET(req: Request) {
  const session = await requireSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const fmt = (searchParams.get('format') ?? 'csv') as Fmt
  const { householdId } = session

  if (type === 'income') {
    const items = await prisma.income.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    })
    const rows = items.map((r) => ({
      name: r.name,
      amount: r.amount,
      frequency: r.frequency,
      startDate: format(r.startDate, 'yyyy-MM-dd'),
      endDate: r.endDate ? format(r.endDate, 'yyyy-MM-dd') : '',
      notes: r.notes ?? '',
      active: r.active,
    }))
    return respond(rows, 'income', fmt)
  }

  if (type === 'budget') {
    const items = await prisma.budgetItem.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    })
    const rows = items.map((r) => ({
      name: r.name,
      category: r.category ?? '',
      amount: r.amount,
      frequency: r.frequency,
      startDate: format(r.startDate, 'yyyy-MM-dd'),
      endDate: r.endDate ? format(r.endDate, 'yyyy-MM-dd') : '',
      notes: r.notes ?? '',
      active: r.active,
    }))
    return respond(rows, 'budget', fmt)
  }

  if (type === 'transactions') {
    const items = await prisma.transaction.findMany({
      where: { householdId },
      include: {
        budgetItem: { select: { name: true } },
        income: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    })
    const rows = items.map((r) => ({
      type: r.type,
      amount: r.amount,
      date: format(r.date, 'yyyy-MM-dd'),
      description: r.description ?? '',
      budgetItem: r.budgetItem?.name ?? '',
      income: r.income?.name ?? '',
    }))
    return respond(rows, 'transactions', fmt)
  }

  return new Response('Invalid type', { status: 400 })
}
