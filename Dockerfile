FROM docker.1ms.run/library/node:24.15.0-slim

WORKDIR /app

# Use Tencent mirror and install nginx
RUN sed -i 's|deb.debian.org|mirrors.tencent.com|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy production dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
    && pnpm install --prod --frozen-lockfile --ignore-scripts \
    && npm install -g prisma@5.22.0

# Copy schema and generate Prisma client
COPY prisma/schema.prisma prisma/schema.prisma
RUN prisma generate

# Copy build output
COPY dist/apis/ dist/apis/

# Create uploads directory
RUN mkdir -p uploads

# Copy frontend to nginx html dir
COPY dist/pages/ /usr/share/nginx/html/

# Copy nginx config
RUN mkdir -p /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Default env vars
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 80

CMD ["/app/docker-entrypoint.sh"]
