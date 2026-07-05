# 2026-07-02 VS Code dev 启动数据库就绪检查

## 背景

VS Code 直接运行 `dev` 任务时只执行 `pnpm run dev`，不会经过 `启动项目.bat` 的 PostgreSQL 启动与等待逻辑。数据库未就绪时，登录接口内的 Prisma 查询会抛出连接失败，但认证控制器统一返回“用户名或密码错误”，造成账号密码异常的误判。

## 修复内容

- 新增 `scripts/wait-for-db.cjs`，在后端 dev server 启动前根据 `DATABASE_URL` 或 `DB_HOST`/`DB_PORT` 检查 PostgreSQL 端口就绪。
- 更新 `package.json`：
  - `dev:api` 先执行数据库等待脚本，再启动 `ts-node apis/server.ts`。
  - `dev` 增加 `concurrently --kill-others-on-fail`，后端因数据库不可用失败时同步停止前端。
- 新增 `tests/scripts/wait-for-db.test.cjs`，覆盖数据库端口不可达时必须输出清晰 PostgreSQL readiness 提示。

## 验证

- `node tests/scripts/wait-for-db.test.cjs` 通过。
- 实测 `http://localhost:8080/api/health` 返回 200。
- 实测 `POST /api/v1/auth/login` 使用 `123 / 123` 返回登录成功。

## 注意

如果 PostgreSQL 未启动，VS Code dev 任务现在会在后端启动前失败并提示启动数据库；这不是账户密码错误。
