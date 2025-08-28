-- CreateEnum
CREATE TYPE "WeekendPolicy" AS ENUM ('FRIDAY_BEFORE', 'AS_IS');

-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "weekendPolicy" "WeekendPolicy" NOT NULL DEFAULT 'FRIDAY_BEFORE';
