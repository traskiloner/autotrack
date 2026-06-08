# Stage 1: Build the SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

RUN npm ci --include=dev

COPY shared/ ./shared/
RUN npm run build -w shared

COPY frontend/ ./frontend/
RUN npm run build -w frontend

# Stage 2: Serve the SPA with Nginx
FROM nginx:stable-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
