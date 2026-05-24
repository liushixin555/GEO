# 2026-05-24 Controller TDD 测试修复

## 变更摘要
修复 7 个 controller 测试套件中 40+ 失败用例，最终 650 个测试用例全部通过。

## 源码 Bug 修复
1. **llm-model SSRF IPv6 防护失效**：`BLOCKED_HOSTNAMES` 正则未匹配带方括号的 IPv6 hostname（如 `[::1]`）
2. **user controller 双重 Zod parse**：validate middleware 已 parse+transform，controller 再次 parse 导致 Zod v4 enum 收到布尔值报错

## 测试修复
- llm-model：API 路径 `/api/llm-models` → `/api/v1/llm-models`，Zod v4 错误消息断言
- auth：verify 端点添加 getPrisma mock
- user：验证消息添加"参数验证失败:"前缀
- system-config：config_value 类型断言更新

## 覆盖率
| Controller | Stmts | Branch | Funcs |
|------------|-------|--------|-------|
| auth       | 88.5% | 87.0%  | 100%  |
| company    | 100%  | 100%   | 100%  |
| skills     | ~90%  | ~85%   | ~95%  |
| user       | ~95%  | ~90%   | 100%  |
| llm-model  | 91.5% | 81.6%  | 100%  |
| system-config | ~95% | ~90%  | 100%  |
| todo       | ~90%  | ~85%   | ~95%  |

## 经验教训
- Zod v4 的 `z.string({ error: 'xxx' })` 对非字符串输入返回自定义错误（不是 "expected string"）
- validate middleware 会给错误消息加"参数验证失败:"前缀
- validate middleware 的 `source === 'query'` 会把 `req.query` 替换为 transform 后的数据
- `new URL('http://[::1]/v1')` 返回 `hostname: '[::1]'`（带方括号）
