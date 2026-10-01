# ==========================================
# Stage 1: Build the React application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy application source code
COPY . .

# Build production bundle with Vite
RUN npm run build

# ==========================================
# Stage 2: Serve with lightweight Nginx
# ==========================================
FROM nginx:alpine

# Copy built production assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx template for dynamic backend proxying
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default backend URL (can be overridden via -e BACKEND_URL=... at runtime)
ENV BACKEND_URL=http://s3-backend:28080

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
