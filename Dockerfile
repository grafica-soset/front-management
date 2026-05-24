# syntax=docker/dockerfile:1

# ---- Estágio de build ----
FROM node:22-slim AS build
WORKDIR /app

# NUXT_API_BASE_URL é necessário no build: o proxy /api/** do Nitro
# (routeRules) é compilado para o output em tempo de build.
ARG NUXT_API_BASE_URL
ENV NUXT_API_BASE_URL=$NUXT_API_BASE_URL

COPY package.json package-lock.json ./
# npm install (em vez de npm ci): o npm ci falha de forma intermitente com as
# dependências opcionais WASM do oxc-parser/rollup (bug conhecido do npm com
# optionalDependencies por plataforma). install respeita o lock e é confiável.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Estágio de runtime (enxuto) ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
# O Cloud Run injeta a variável PORT; o servidor Nitro a respeita.

COPY --from=build /app/.output ./.output

EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
