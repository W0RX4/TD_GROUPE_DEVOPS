FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dépendances d'abord pour profiter du cache Docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./

# Ne pas tourner en root
USER node

EXPOSE 3000
CMD ["node", "server.js"]
