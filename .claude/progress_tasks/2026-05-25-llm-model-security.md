# 2026-05-25 LLM模型控制器安全评审修复

## 任务来源
tasks/review/llm-model.controller.security.md

## 修复: S-H3+S-M2+S-M3+S-C3
- handleError 添加 logger.error 错误日志
- create/update/delete 添加审计日志
- 删除前检查文章引用 + 清除 API Key
- API Key AES-256-GCM 加密存储
- 新增 encryption.util.ts

## 验证
- build/lint/test 全部通过
