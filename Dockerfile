FROM docker.1ms.run/library/node:24.15.0-slim

WORKDIR /app

# Install nginx
RUN apk add --no-cache nginx

# Copy production dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

# Copy build output
COPY dist/apis/ dist/apis/

# Create uploads directory
RUN mkdir -p uploads

# Copy frontend to nginx html dir
COPY dist/pages/ /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/conf.d/default.conf.bak

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Default env vars
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 80

CMD ["/app/docker-entrypoint.sh"]
