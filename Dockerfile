FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY client client
COPY server server
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev --workspace server

COPY --from=build /app/client/dist client/dist
COPY server server

EXPOSE 4000
CMD ["npm", "--workspace", "server", "run", "start"]
