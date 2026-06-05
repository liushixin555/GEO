FROM docker.1ms.run/library/node:24.15.0-slim

WORKDIR /app

# Install nginx
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy production dependencies
COPY package.json pnpm-lock.yaml .npmrc ./

ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
RUN corepack enable \
    && pnpm install --prod --frozen-lockfile --ignore-scripts \
    && npm install -g prisma@5.22.0

# Copy schema and migrations, generate Prisma client
COPY prisma/schema.prisma prisma/schema.prisma
COPY prisma/migrations prisma/migrations
RUN prisma generate --generator=client

# Copy build output (tsconfig rootDir=. causes nested apis/ dir)
COPY dist/apis/apis/ dist/apis/

# Copy swagger spec (not compiled by tsc, needed when swagger enabled)
COPY apis/swagger-spec.json dist/apis/swagger-spec.json

# Create uploads directory
RUN mkdir -p uploads

# Copy frontend to nginx html dir
COPY dist/pages/ /usr/share/nginx/html/

# Copy nginx config
RUN mkdir -p /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copy env file
COPY .env .env

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Default env vars
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 80

CMD ["/app/docker-entrypoint.sh"]
