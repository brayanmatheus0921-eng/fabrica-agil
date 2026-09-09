FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@9.15.9

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm db:generate \
    && DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    pnpm build

FROM base AS runner

ENV NODE_ENV="production"
ENV PORT="3000"
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed && pnpm start"]
