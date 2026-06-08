FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --include=dev

# Copy shared code and build it
COPY shared/ ./shared/
RUN npm run build -w shared

# Copy backend code
COPY backend/ ./backend/

# Generate Prisma Client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Build backend
RUN npm run build -w backend

EXPOSE 5001

WORKDIR /app/backend

CMD ["npm", "run", "start"]
