#!/bin/sh
set -e

# If prisma schema exists, ensure client is generated for dev
if [ -d "./prisma" ]; then
  npx prisma generate || true
fi

exec npm run dev
