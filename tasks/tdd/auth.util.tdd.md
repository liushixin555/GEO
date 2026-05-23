# TDD 执行报告：auth.util.ts

## 源文件
`apis/utils/rmapi.utils/auth.util.ts`

## 测试文件
`tests/apis/utils/rmapi.utils/auth.util.test.ts`

## 测试结果

```
PASS tests/apis/utils/rmapi.utils/auth.util.test.ts (5.073 s)
  apis/utils/rmapi.utils/auth.util.ts
    getRmToken
      ✓ should return token on successful authentication
      ✓ should send correct request body with fixed fields
      ✓ should throw error when success is false
      ✓ should throw error with message from response
      ✓ should propagate network errors from axios
      ✓ should propagate timeout errors from axios
      ✓ should call correct endpoint URL

Tests:       7 passed, 7 total
```

## 覆盖率

| 指标       | 覆盖率 |
|-----------|--------|
| Statements | 100%   |
| Branches   | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

## 测试用例清单

| # | 测试用例 | 描述 |
|---|---------|------|
| 1 | should return token on successful authentication | 认证成功返回 token |
| 2 | should send correct request body with fixed fields | 验证请求体包含所有固定字段（identity, captcha_token, captcha, api_key） |
| 3 | should throw error when success is false | success=false 时抛出包含响应消息的错误 |
| 4 | should throw error with message from response | 不同错误消息正确传递到异常 |
| 5 | should propagate network errors from axios | axios 网络错误正确传播 |
| 6 | should propagate timeout errors from axios | axios 超时错误正确传播 |
| 7 | should call correct endpoint URL | 验证请求 URL 正确 |

## 测试策略

- **Mock axios**: 使用 `jest.mock('axios')` 模拟 HTTP 请求，隔离外部依赖
- **正向测试**: 验证成功场景下 token 正确返回、请求参数完整
- **逆向测试**: 验证认证失败时错误消息正确传递
- **异常测试**: 验证网络错误和超时错误正确传播
