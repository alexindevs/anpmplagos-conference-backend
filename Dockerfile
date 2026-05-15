# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Prisma generated client (not produced by npm ci --omit=dev alone)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Compiled application
COPY --from=builder /app/dist ./dist

# Email templates — referenced at runtime via process.cwd()/src/support/email-templates
COPY --from=builder /app/src/support/email-templates ./src/support/email-templates

# Prisma schema (needed for potential migrations / introspection at runtime)
COPY prisma ./prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
