# llm-model.controller.test.ts TDD 执行报告

## 基本信息
- **测试文件**: tests/apis/llm-model.controller.test.ts
- **源文件**: apis/controller/llm-model.controller.ts
- **执行日期**: 2026-05-23
- **测试数量**: 29 个测试
- **测试结果**: 29 passed, 0 failed

## 测试覆盖率

| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|-----------|
| Statements | 100% | - |
| Branch | 76.92% | - |
| Functions | 100% | - |
| Lines | 100% | - |

## 测试用例清单

### GET /api/llm-models (6个)
1. should return 401 without token
2. should return 403 for admin role
3. should return 403 for view role
4. should return models list for sysadmin
5. should return empty list when no models
6. should return 500 on database error

### GET /api/llm-models/enabled (3个)
1. should return enabled models for sysadmin
2. should return enabled models for admin
3. should return 500 on database error

### GET /api/llm-models/:id (4个)
1. should return 400 for invalid id
2. should return model detail for sysadmin
3. should return 404 for non-existent model
4. should return 500 on database error

### POST /api/llm-models (6个)
1. should return 400 when required fields are missing
2. should return 400 when base_url is missing
3. should return 400 when api_key is missing
4. should return 400 when model_name is missing
5. should create model successfully
6. should return 500 on database error during create

### PUT /api/llm-models/:id (6个)
1. should return 400 for invalid id
2. should update model successfully
3. should return 404 for non-existent model
4. should update status successfully
5. should update multiple fields
6. should return 500 on database error

### DELETE /api/llm-models/:id (4个)
1. should return 400 for invalid id
2. should return 404 for non-existent model
3. should delete model successfully
4. should return 500 on database error

## 修复的问题
1. **DELETE 测试修复**: 原测试 mock 了 `delete` 方法但 service 使用软删除（`update` + `deletedAt`）。修正为 mock `update`
2. **新增 listEnabledLlmModels 测试**: 补充 GET /api/llm-models/enabled 端点测试（admin 也可访问）
3. **新增 getLlmModel 测试**: 补充 GET /api/llm-models/:id 获取单个模型详情测试
4. **新增更多验证场景**: 覆盖所有字段缺失（base_url、api_key、model_name）、状态更新、多字段更新
