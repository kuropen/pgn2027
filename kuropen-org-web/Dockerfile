FROM node:24.21.0-alpine AS base

FROM base AS builder

RUN mkdir -p /src
WORKDIR /src
COPY . /src/
RUN npm ci && npm run build

FROM base AS runner

RUN mkdir -p /app
WORKDIR /app
COPY --from=builder /src/node_modules /app/
COPY --from=builder /src/dist /app/
ENV HOST=0.0.0.0
ENV PORT=4321
CMD ["node", "dist/server/entry.mjs"]
EXPOSE 4321
