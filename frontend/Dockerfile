# ── Stage 1: Build production assets ──────────────────────────────────────────
# NOTE: The production web image is built by nginx/Dockerfile (not this file).
# This build stage exists so the image can be referenced in local tooling if needed.
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Stage 2: Local development server (hot-reload) ────────────────────────────
# Usage: docker compose run --service-ports frontend
FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# In Docker dev, the Vite dev server proxies /api and /auth to backend:5001
ENV VITE_PROXY_TARGET=http://backend:5001
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
