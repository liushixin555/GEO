# llm-model.controller TDD 补全（第二轮）

## 日期
2026-05-24

## 变更摘要
对 `llm-model.controller.ts` 进行 TDD 测试补全，新增 33 个测试用例（157 → 190），覆盖率大幅提升。

## 覆盖率对比

| 维度 | 补全前 | 补全后 | 提升 |
|------|--------|--------|------|
| Stmts | 91.47% | 98.44% | +6.97% |
| Branch | 81.63% | 95.91% | +14.28% |
| Funcs | 100% | 100% | - |
| Lines | 97.89% | 100% | +2.11% |

## 新增测试（+33 用例）

### 1. 直接控制器单元测试（8+6=14 用例）
绕过 Zod 验证中间件，直接调用 `updateLlmModel` 和 `createLlmModel` 函数，覆盖：
- 行 131: '至少提供一个更新字段'（空 body）
- 行 153: 'status 必须为布尔值'（string/number/null/array/object）
- validateOptionalString 分支：非 string 类型、超长、空白
- validateRequiredString 分支：null、非 string、超长、空白、boolean

### 2. parseId 边界测试（3 用例）
- 大数字 id (999999)
- 含空格 id（URL 编码）
- 超大数字 id

### 3. isUrlSafe 额外边界（4 用例）
- 带端口公共域名
- 纯空格 base_url
- 172.15.x.x（非 RFC 1918 范围）
- 172.32.x.x（RFC 1918 范围以上）

### 4. PUT 额外验证（4 用例）
- javascript:/data: 协议拒绝
- 有效 http:// URL 更新
- 有效 api_key 更新

### 5. POST 长度边界（4 用例）
- provider/model_name 精确 max/max+1 长度

### 6. 响应格式验证（1 用例）

## 测试技术
- 集成测试：supertest → Express app → auth + Zod 中间件 → controller
- 单元测试：直接 `require` controller 函数 + mock req/res，绕过中间件
- 解决 Zod 中间件拦截导致控制器防御性代码无法覆盖的问题

## 文件变更
- `tests/apis/llm-model.controller.test.ts`: +33 测试用例
- `tasks/tdd/llm-model.controller.test.md`: 更新 TDD 报告
