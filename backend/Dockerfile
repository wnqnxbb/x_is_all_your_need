FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "-r", "esbuild-register/register", "./dist/main.js"]
