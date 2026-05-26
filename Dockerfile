FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
# Pre-seed with demo data (full node_modules available here)
RUN DB_PATH=/app/seed.db node scripts/seed.cjs 2>&1 || DB_PATH=/app/seed.db node scripts/seed.mjs 2>&1 || echo "seed failed, creating empty db" && node -e "require('better-sqlite3')('/app/seed.db').close()"

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/seed.db ./seed.db
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p /data && chown nextjs:nodejs /data
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
