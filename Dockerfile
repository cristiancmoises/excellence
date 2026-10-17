FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
ENV NODE_ENV=production EXCELLENCE_HOST=0.0.0.0 PORT=3210 EXCELLENCE_DATA_DIR=/data
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /build/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node src/shared.mjs ./src/shared.mjs
COPY --chown=node:node scripts/backup.mjs ./scripts/backup.mjs
COPY --chown=node:node LICENSE THIRD_PARTY_NOTICES.txt ./
USER node
EXPOSE 3210
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3210/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
