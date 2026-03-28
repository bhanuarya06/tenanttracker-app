FROM node:20-alpine3.19

WORKDIR /app

# Install production dependencies only (devDependencies are not needed at runtime)
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Persistent volume mount point for tenant-uploaded files
RUN mkdir -p uploads

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5001/health || exit 1

CMD ["node", "src/server.js"]
