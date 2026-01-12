# Simple production Dockerfile for API
FROM node:20-alpine as base
WORKDIR /app

# Copy root and app manifests
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm install --omit=dev --workspaces=false && \
    npm install --workspace=apps/api --omit=dev && \
    npm cache clean --force

COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api ./apps/api

RUN npm --workspace=apps/api run build

EXPOSE 3001
ENV PORT=3001 NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]

