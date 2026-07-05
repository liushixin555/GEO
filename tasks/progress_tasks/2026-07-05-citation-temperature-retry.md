# 2026-07-05 引用检测模型 temperature 兼容修复

## 背景

- 引用检测中部分模型返回 `HTTP 400: invalid temperature: only 1 is allowed for this model`。
- 该错误由检测系统统一发送 `temperature=0.2` 触发，属于 OpenAI 兼容模型参数约束差异，不代表发布链接或命中匹配失败。

## 修复内容

- `citation-collector.util.ts` 保持默认 `temperature=0.2`。
- 当 provider 返回 400 且错误信息明确包含 `invalid temperature` 和 `only 1` 时，只对该请求重试一次 `temperature=1`。
- 重试仍使用同一套 URL 来源解析和 API Key 隐私规则，不打印密钥。

## 验收记录

- `npx.cmd jest --config jest.api.config.cjs --runTestsByPath tests/apis/citation-collector.util.test.ts --runInBand` 通过，9 个测试通过。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。
- 本地后端 `/api/health` 返回 200。
