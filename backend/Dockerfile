FROM node:20-alpine AS dependencias

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

FROM node:20-alpine AS compilacion

WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-alpine AS produccion

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=compilacion --chown=node:node /app/package*.json ./
COPY --from=compilacion --chown=node:node /app/node_modules ./node_modules
COPY --from=compilacion --chown=node:node /app/.next ./.next
COPY --from=compilacion --chown=node:node /app/prisma ./prisma
COPY --from=compilacion --chown=node:node /app/server.js ./server.js
COPY --from=compilacion --chown=node:node /app/src ./src

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '4000') + '/api/salud').then((respuesta) => process.exit(respuesta.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
