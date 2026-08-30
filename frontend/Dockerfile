# Production image for the Qwik City frontend (Node server adapter).
#
# The client bundle bakes PUBLIC_API_BASE_URL at BUILD time (Vite inlines
# PUBLIC_* vars), so the API origin is a build ARG, not a runtime env var. In
# production we serve single-origin (frontend + API under one host), so the API
# is reachable at the relative path /api/v1 — no absolute URL, no CORS.
#
# The Qwik node-server output (server/*.js) bundles everything except one
# external package — `undici` (the fetch implementation the node middleware
# imports; it has zero dependencies of its own). So the runtime stage carries
# just the built client (dist/), the server (server/), and node_modules/undici.

# --- build: install deps and produce dist/ + server/ ------------------------
FROM node:22-slim AS build
WORKDIR /app

# Dependency layer first (cached across code-only changes).
COPY package.json package-lock.json ./
RUN npm ci

# App source, then the production build. PUBLIC_API_BASE_URL is baked here.
COPY . .
ARG PUBLIC_API_BASE_URL=/api/v1
ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL
RUN npm run build

# --- runtime: node + built client/server only, non-root --------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# The built client + server, plus the one external runtime dep (undici, which
# is dependency-free). `node` user ships with the base image.
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/node_modules/undici ./node_modules/undici

USER node

# The node-server entry reads process.env.PORT (default 3004). Dokku injects PORT.
EXPOSE 3004
CMD ["node", "server/entry.node-server"]
