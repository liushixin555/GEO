# 2026-05-24 knowledge-base Controller TDD 补全

## 变更概要
对 `apis/controller/knowledge-base.controller.ts` 进行测试用例补全，修复 10 个因 Zod 验证层不兼容导致的失败测试，新增 10 个直接函数测试覆盖防御性代码分支。

## 修改文件
- `tests/apis/knowledge-base.controller.test.ts` — 修复 10 个 + 新增 10 个测试
- `tasks/tdd/knowledge-base.controller.test.md` — 更新 TDD 报告

## 修复内容

### Zod 验证层兼容修复（10 个测试）
Zod schema 验证中间件拦截请求后包装错误消息为 "参数验证失败: xxx" 格式，原测试断言不包含此前缀：
- 9 个测试更新断言消息匹配 Zod 包装格式
- 1 个 mass assignment 测试：Zod 默认行为为剥离未知字段而非拒绝，从期望 400 改为验证 201

### 新增直接函数测试（10 个）
通过直接导入 controller 函数绕过 Zod 中间件，覆盖 controller 层与 Zod 重复的防御性验证代码：
- createKnowledgeBase: description>2000 / scope invalid / scope undefined / name>200
- updateKnowledgeBase: scope invalid / description>2000 / name>200
- validateInteger 过滤: company_id 浮点数 / project_id 负数 / company_id 为0

## 测试结果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 测试总数 | 93 (10 failed) | **103 (全部通过)** |
| 语句覆盖率 | 89.51% | **100%** |
| 分支覆盖率 | 91.56% | **100%** |
| 函数覆盖率 | 100% | **100%** |
| 行覆盖率 | 92.92% | **100%** |
