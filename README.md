# Hartza

Household budget and financial management app. Track income, budget allocations, and transactions — with cash flow forecasting and multi-user household support.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL via Prisma
- **UI**: Tailwind CSS 4, Recharts
- **Auth**: NextAuth.js (credentials + bcrypt)
- **Validation**: Zod

## Features

- **Multi-user households** — join-code system, owner/member roles
- **Recurring income & budgets** — weekly / fortnightly / monthly / one-off frequencies with date ranges
- **Transaction tracking** — link to budget items or income sources
- **Cash flow forecasting** — projected balance with scheduled events
- **Dashboard** — monthly totals, per-item spending vs. allocated, progress bars
- **CSV import/export** — transactions in and out
- **PWA** — installable on mobile

## Structure

```
hartza/
├── app/
│   ├── api/          # Backend routes (transactions, budget, income, forecast, auth)
│   ├── components/   # Sidebar, CashFlowChart, BalanceSetup, etc.
│   ├── lib/          # Auth, budget calculations, CSV parsing, Prisma client
│   └── prisma/       # Schema (Household, User, Income, BudgetItem, Transaction)
└── docker-compose.yml
```

## Setup

```bash
cp .env.example .env
# fill in DATABASE_URL, NEXTAUTH_SECRET
docker compose up --build
```

**Manual (dev):**
```bash
npm install
npm run prisma:push
npm run dev
```

App runs on **port 5127** (Docker) or **3000** (local dev).

## Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auth signing secret |
| `NEXTAUTH_URL` | Public URL of the app |

## License

MIT
