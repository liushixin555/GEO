#!/bin/sh
set -e

# Run database migrations on startup
echo "正在运行数据库迁移..."
npx prisma migrate deploy || echo "警告: 数据库迁移失败，继续启动..."

# Start Node.js backend in background
node dist/apis/server.js &

# Start nginx in foreground
exec nginx -g 'daemon off;'
