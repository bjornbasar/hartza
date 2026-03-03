/**
 * Migration script: assign all existing rows to a new default household.
 *
 * Usage (inside the web container):
 *   node scripts/migrate-household.mjs "My Household"
 *
 * After running:
 *   1. Note the printed join code
 *   2. Register at /register and choose "Join with code" using that code
 *      (the first person to join an empty household becomes OWNER)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const householdName = process.argv[2] ?? 'My Household'

function generateJoinCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function main() {
  // Ensure a unique join code
  let joinCode = generateJoinCode()
  while (await prisma.household.findUnique({ where: { joinCode } })) {
    joinCode = generateJoinCode()
  }

  // Create the household
  const household = await prisma.household.create({
    data: { name: householdName, joinCode },
  })

  console.log(`\nCreated household: "${household.name}" (id: ${household.id})`)
  console.log(`Join code: ${household.joinCode}\n`)

  // Assign all orphaned rows to this household
  const [incomes, budgetItems, transactions, configs] = await Promise.all([
    prisma.income.updateMany({
      where: { householdId: null },
      data: { householdId: household.id },
    }),
    prisma.budgetItem.updateMany({
      where: { householdId: null },
      data: { householdId: household.id },
    }),
    prisma.transaction.updateMany({
      where: { householdId: null },
      data: { householdId: household.id },
    }),
    prisma.config.updateMany({
      where: { householdId: null },
      data: { householdId: household.id },
    }),
  ])

  console.log(`Migrated rows:`)
  console.log(`  Income:      ${incomes.count}`)
  console.log(`  BudgetItems: ${budgetItems.count}`)
  console.log(`  Transactions:${transactions.count}`)
  console.log(`  Config:      ${configs.count}`)

  console.log(`
Next steps:
  1. Run: docker compose exec hartza-web npx prisma db push
     (to lock householdId as required — remember to update the schema first)
  2. Go to /register → "Join with code" → enter: ${household.joinCode}
     (first joiner of an empty household becomes OWNER automatically)
`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
