# Build context: repo root
# CI command: docker build -f nginx/Dockerfile -t <image> .

# ── Stage 1: Build the React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy manifests first so this layer is cached until dependencies change
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build with the production API base URL
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Stage 2: Nginx — serves built assets and proxies the backend ───────────────
FROM nginx:alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
