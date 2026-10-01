FROM oven/bun:1.4.2 AS builder
WORKDIR /app/v2

COPY v2/package.json v2/bun.lock ./
RUN bun install --frozen-lockfile

COPY v2 ./
COPY src/sheets /app/src/sheets
COPY src/SWE_RESUME_RUSTAM_ASHURMATOV.pdf /app/src/
RUN bun run build

FROM oven/bun:1.4.2
WORKDIR /app
COPY --from=builder /app/v2/dist ./dist
COPY v2/server.ts ./server.ts
USER bun
EXPOSE 8080
CMD ["bun", "server.ts"]
