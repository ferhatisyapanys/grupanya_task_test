# Simple production Dockerfile for Web
FROM node:20-alpine as base
WORKDIR /app

COPY package.json package-lock.json* npm-shrinkwrap.json* ./
COPY apps/web/package.json ./apps/web/package.json

RUN npm install --omit=dev --workspaces=false && \
    npm install --workspace=apps/web --omit=dev && \
    npm cache clean --force

COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/web ./apps/web

RUN npm --workspace=apps/web run build

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production
CMD ["npm", "--workspace=apps/web", "run", "start"]

