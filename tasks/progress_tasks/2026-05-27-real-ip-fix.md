# fix064: 日志IP显示 ::1 而非真实客户端IP

**日期**: 2026-05-27
**状态**: ✅ 已修复

## 问题描述

所有日志（api_access、auth.login、anti-crawl 等）中 IP 字段始终显示 `::1`，无法获取访问者真实 IP。

## 根因分析

1. **Vite proxy 不转发客户端 IP**: Vite dev server 的 `http-proxy` 默认 `xfwd: false`，不写入 `X-Forwarded-For` 头。远程客户端（如 `192.168.x.x`）的请求经 Vite 代理后，后端只看到 Vite 的连接地址 `::1`
2. **代码直接使用 `req.ip`**: 所有 IP 获取点直接用 `req.ip`，未检查代理头 `X-Forwarded-For` / `X-Real-IP`，在生产环境 Nginx 代理后也无法获取真实 IP

## 修复方案

### 1. 新建 `apis/utils/ip.util.ts` — 统一真实 IP 提取

```ts
export function getClientIp(req: Request): string
```

优先级链：`X-Forwarded-For` (首 IP) → `X-Real-IP` → `req.ip` → `req.socket.remoteAddress` → `'unknown'`

自动剥离 `::ffff:` IPv6 映射前缀。

### 2. 替换所有 `req.ip` → `getClientIp(req)`

涉及文件：
- `apis/app.ts` — 审计日志（4xx/5xx + 全局错误处理）
- `apis/controller/auth.controller.ts` — 登录/登出/验证/选择等日志
- `apis/middleware/anti-crawl.middleware.ts` — 反爬虫 IP 限速
- `apis/controller/publishing-platform.controller.ts` — 同步操作审计
- `apis/controller/llm-model.controller.ts` — LLM 模型操作审计

### 3. Vite proxy 启用 `xfwd: true`

`vite.config.ts` 三个代理规则（`/api`、`/uploads`、`/api-docs/`）均添加 `xfwd: true`，使 `http-proxy` 在转发时自动写入 `X-Forwarded-For: <客户端IP>`。

## 验证

- `tsc --noEmit` 编译通过（api + page）
- `eslint` lint 通过
- 本机访问 IP 从 `::1` 变为 `127.0.0.1`（stripIp 去掉 IPv6 映射）
- 远程机器访问时 IP 正确显示客户端 LAN IP
