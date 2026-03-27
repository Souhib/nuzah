# Multi-stage build for Nuzah frontend

# Stage 1: Build
FROM oven/bun:1-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Build arguments for Umami analytics
ARG VITE_UMAMI_URL
ARG VITE_UMAMI_WEBSITE_ID

# Set environment variables for build
ENV VITE_UMAMI_URL=${VITE_UMAMI_URL}
ENV VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}

# Build the application
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN bun run build

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
