FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/app.js"]
