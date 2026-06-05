#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查是否需要 Docker 数据库（主机 5432 已有 PostgreSQL 时跳过）
setup_database() {
  # 检查主机 5432 是否已有 PostgreSQL
  if pg_isready -h localhost -p 5432 -U postgres -q 2>/dev/null; then
    echo "主机 PostgreSQL 已在 5432 端口运行，跳过 Docker 数据库"
    return 0
  fi

  # 使用 Docker 容器
  if sudo docker ps --filter "name=by-db" --filter "status=running" | grep -q "by-db"; then
    echo "Docker 数据库容器已在运行"
  elif sudo docker ps -a --filter "name=by-db" | grep -q "by-db"; then
    echo "Docker 数据库容器已存在但未运行，正在启动..."
    sudo docker start by-db
  else
    echo "正在创建 Docker 数据库容器..."
    sudo docker run -d --name by-db --restart=always -p 5432:5432 \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=geo_ts \
      -v ~/docker_data/postgresql_by:/var/lib/postgresql/data \
      docker.1ms.run/library/postgres:18.3-bookworm
  fi

  echo "等待数据库就绪..."
  for i in $(seq 1 15); do
    if sudo docker exec by-db pg_isready -U postgres -d geo_ts -q 2>/dev/null; then
      echo "数据库已就绪"
      return 0
    fi
    sleep 1
  done
  echo "警告: 数据库可能未就绪，继续执行..."
}

setup_database

# 检查是否需要 seed
SEED_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d geo_ts -tAc 'SELECT COUNT(*) FROM "Enterprise";' 2>/dev/null)

if [ -z "$SEED_COUNT" ]; then
  echo "警告: 无法连接数据库检查 seed 状态，跳过 seed"
elif [ "$SEED_COUNT" = "0" ]; then
  echo "数据库未初始化，正在执行 seed 脚本..."
  npx prisma migrate dev --name init
  echo "y" | npx prisma db seed
else
  echo "数据库已初始化（Enterprise 记录数: $SEED_COUNT），跳过 seed"
fi
pnpm build
# docker build
echo "正在构建 Docker 镜像..."
sudo docker build -t by:latest .

# 停掉并删除之前的应用容器
sudo docker stop by 2>/dev/null || true
sudo docker rm by 2>/dev/null || true

# 生成 Docker 环境变量文件（去掉引号，Docker --env-file 不处理引号）
DOCKER_ENV=$(mktemp)
sed 's/=\s*"\(.*\)"\s*$/=\1/' "$SCRIPT_DIR/.env" > "$DOCKER_ENV"

# 运行新的容器（通过 host.docker.internal 访问主机 PostgreSQL）
echo "正在启动应用容器..."
sudo docker run -d --name by --restart=always -p 12380:80 \
  --env-file "$DOCKER_ENV" \
  -v ~/docker_data/by/app/public:/app/public \
  -v ~/docker_data/by/app/skills:/app/skills \
  -v ~/docker_data/by/app/uploads:/app/uploads by:latest

rm -f "$DOCKER_ENV"
