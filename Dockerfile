# Stage 1: Install dependencies
FROM oven/bun:1.3.11-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build application
FROM oven/bun:1.3.11-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE

# Dummy values satisfy lib/env.ts's eager Zod validation at page-data collection time.
# ENV scope is builder-stage only — multi-stage build means none of these reach the runner.
ENV DATABASE_URL="postgresql://build:build@localhost/build" \
    BETTER_AUTH_SECRET="build-time-placeholder-not-used-at-runtime" \
    BETTER_AUTH_URL="http://localhost:3000"

RUN bun run db:generate && bun run build

# Stage 3: Production runner
FROM oven/bun:1.3.11-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/docker ./docker

RUN chmod +x ./docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bun", "run", "start"]
