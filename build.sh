#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 查找已在 5432 端口提供服务的数据库容器（可能是 pg / by-db / 任意名称）
find_db_container() {
  sudo docker ps --filter "publish=5432" --format '{{.Names}}' | head -1
}

# 在容器内等待 PostgreSQL 就绪（用容器自带的 pg_isready，不依赖主机客户端）
wait_for_db_ready() {
  local c="$1"
  for i in $(seq 1 30); do
    if sudo docker exec "$c" pg_isready -U postgres -d geo_ts -q 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# 检查并准备数据库：复用已在 5432 服务的容器，绝不重复 docker run；
# 必须真正确认数据库可用才返回成功，否则终止构建
setup_database() {
  # 清理本脚本历史失败遗留的 by-db 残骸（存在但未正常服务 5432）
  if sudo docker ps -a --filter "name=^/by-db$" --format '{{.Names}}' | grep -q '^by-db$'; then
    if [ -z "$(sudo docker ps --filter "name=^/by-db$" --filter "publish=5432" --format '{{.Names}}')" ]; then
      echo "清理遗留的失败 by-db 容器..."
      sudo docker rm -f by-db >/dev/null
    fi
  fi

  local existing
  existing=$(find_db_container)

  # 1) 已有容器在 5432 服务 → 直接复用，绝不重复 docker run
  if [ -n "$existing" ]; then
    echo "检测到容器 [$existing] 已在 5432 端口运行，复用，不创建新容器"
    if wait_for_db_ready "$existing"; then
      echo "数据库 [$existing] 已就绪可用"
      DB_CONTAINER="$existing"
      return 0
    fi
    echo "错误: 容器 [$existing] 占用 5432 但 PostgreSQL 不可用" >&2
    return 1
  fi

  # 2) 没有容器占用 5432 → 创建新的 by-db
  echo "5432 端口空闲，正在创建数据库容器 by-db..."
  sudo docker run -d --name by-db --restart=always -p 5432:5432 \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=geo_ts \
    -v ~/docker_data/postgresql_by:/var/lib/postgresql/data \
    postgres:16 >/dev/null || { echo "错误: 创建 by-db 容器失败" >&2; return 1; }

  if wait_for_db_ready by-db; then
    echo "数据库 [by-db] 已就绪可用"
    DB_CONTAINER="by-db"
    return 0
  fi
  echo "错误: by-db 容器已启动但 PostgreSQL 未就绪" >&2
  return 1
}

DB_CONTAINER=""
if ! setup_database; then
  echo "数据库不可用，终止构建" >&2
  exit 1
fi

# 检查是否需要 seed（用容器内 psql，不依赖主机客户端）
SEED_COUNT=$(sudo docker exec "$DB_CONTAINER" psql -U postgres -d geo_ts -tAc 'SELECT COUNT(*) FROM users;' 2>/dev/null)

if [ -z "$SEED_COUNT" ]; then
  echo "警告: 无法查询数据库 seed 状态（geo_ts 库可能尚未初始化），跳过 seed"
elif [ "$SEED_COUNT" = "0" ]; then
  echo "数据库未初始化，正在执行 migrate + seed..."
  npx prisma migrate dev --name init
  echo "y" | npx prisma db seed
else
  echo "数据库已初始化（Enterprise 记录数: $SEED_COUNT），跳过 seed"
fi
# 限制 Node V8 堆上限：部署机仅 3.5G 内存，防止 tsc/vite 构建时堆溢出（exit 134）或触发 OOM
NODE_OPTIONS="--max-old-space-size=2048" pnpm build
# docker build
echo "正在构建 Docker 镜像..."
# 限制 Docker 构建内存上限，配合 swap 防止单步构建吃光内存导致 OOM kill
sudo docker build --memory=2g --memory-swap=3g -t by:latest .

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
