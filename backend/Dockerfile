FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend source
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
COPY backend/src ./src/
COPY backend/tsconfig.json ./

RUN npm ci --ignore-scripts && \
    npx prisma generate && \
    npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN mkdir -p uploads

CMD ["npm", "run", "start"]
