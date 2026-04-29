FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

ENV NODE_ENV=production

RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]