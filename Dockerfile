# ==========================================
# Production Multi-Stage Dockerfile
# SPTech AI Attendance Kiosk & Payroll PWA
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

# Install build dependencies for native modules (sqlite3/bcrypt)
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Persistent storage for uploads & database
VOLUME ["/app/uploads", "/app/data"]

EXPOSE 80 443 5000

CMD ["node", "src/server.js"]
