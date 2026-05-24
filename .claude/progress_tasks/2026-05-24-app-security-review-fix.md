# 2026-05-24 app.ts 安全评审修复

## 修复清单
- SEC-APP-02: 健康检查端点添加 1000 req/min 限流
- SEC-APP-03: uploadDir 默认路径改用 __dirname 替代 process.cwd()
- SEC-APP-04: JSON body 限制从 10MB 收紧至 1MB
- SEC-APP-05: trust proxy 值改为 TRUST_PROXY 环境变量驱动
- SEC-APP-06: Swagger UI 端点添加 CSP
- SEC-APP-07: 请求超时 30s（防 Slowloris）
- SEC-APP-08: 错误日志统一为结构化 JSON

## 验证：API 类型检查通过，Config 测试 188/188 通过，安全评级 A- -> A
