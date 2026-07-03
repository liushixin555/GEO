# 2026-07-03 引用检测模型调用修复

- 自动引用检测不再固定 `DeepSeek/Kimi`，默认读取系统 LLM 配置里全部启用、未删除且 API Key / baseUrl / modelName 完整的模型。
- 模型入库标识使用 `${provider}:${modelName}`，支持同厂商多模型并行检测和台账追踪。
- OpenAI 兼容 baseUrl 会规范为 `/chat/completions`，解决 DeepSeek 根地址直接请求 HTTP 404。
- Kimi/Moonshot 当前缺少系统模型配置，仍需人工在系统管理中新增并启用后才会进入默认检测。
- 验证已覆盖 citation collector 单测、引用诊断编码扫描、API TypeScript noEmit 和 lint；完整 build 当前被本机 Prisma DLL 文件锁阻断。
