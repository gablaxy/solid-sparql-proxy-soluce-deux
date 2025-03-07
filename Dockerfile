FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY src ./src
COPY config ./config
COPY .env ./

CMD ["node", "src/server.js"]
