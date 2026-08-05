FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 3333
CMD ["node", "dist/server.js"]
