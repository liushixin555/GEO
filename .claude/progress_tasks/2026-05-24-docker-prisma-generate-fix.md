# Docker 构建修复——prisma generate --generator=client

**日期**: 2026-05-24
**类型**: Bug 修复
**状态**: ✅ 已完成

## 问题
Docker build 在第 7 步 `RUN prisma generate` 失败：
```
Error: Cannot find module '/app/node_modules/prisma-openapi/dist/index.js'
```

## 原因
- `prisma/schema.prisma` 定义了 `openapi` generator（使用 `prisma-openapi`）
- `prisma-openapi` 在 devDependencies 中
- Dockerfile `pnpm install --prod` 不安装 devDependencies
- `prisma generate` 默认运行所有 generator

## 修复
- `Dockerfile`: `prisma generate` → `prisma generate --generator=client`
- 生产环境只需 Prisma Client，OpenAPI spec 已通过 COPY 拷贝

## 涉及文件
- `Dockerfile` (2 行变更)
