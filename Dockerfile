FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies if needed
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/app.js"]
