# TDD 执行报告：auth.util.ts

## 源文件
`apis/utils/rmapi.utils/auth.util.ts`

## 测试文件
`tests/apis/utils/rmapi.utils/auth.util.test.ts`

## 测试结果

```
PASS tests/apis/utils/rmapi.utils/auth.util.test.ts (10.042 s)
  apis/utils/rmapi.utils/auth.util.ts
    getRmToken
      ✓ should return token on successful authentication
      ✓ should send correct request body with fixed fields
      ✓ should throw error when success is false
      ✓ should throw error with message from response
      ✓ should propagate network errors from axios
      ✓ should propagate timeout errors from axios
      ✓ should call correct endpoint URL
      ✓ should return empty string token when API returns empty token
      ✓ should throw error with empty message when success is false and message is empty
      ✓ should always call axios.post on each invocation (no caching)
      ✓ should propagate non-Error rejections
      ✓ should pass different mobile and password values correctly
      ✓ should include all 6 fields in request body

Tests:       13 passed, 13 total
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
| 8 | should return empty string token when API returns empty token | 空 token 边界场景 |
| 9 | should throw error with empty message when success is false and message is empty | 空消息边界场景 |
| 10 | should always call axios.post on each invocation (no caching) | 每次调用都重新请求（无缓存） |
| 11 | should propagate non-Error rejections | 非 Error 类型异常正确传播 |
| 12 | should pass different mobile and password values correctly | 不同参数值正确传递 |
| 13 | should include all 6 fields in request body | 请求体字段数量验证（6 个） |

## 测试策略

- **Mock axios**: 使用 `jest.mock('axios')` 模拟 HTTP 请求，隔离外部依赖
- **正向测试**: 验证成功场景下 token 正确返回、请求参数完整
- **逆向测试**: 验证认证失败时错误消息正确传递
- **异常测试**: 验证网络错误和超时错误正确传播
- **边界测试**: 空 token、空消息、非 Error 类型异常、无缓存行为
- **参数验证**: 不同 mobile/password 值正确传递，固定字段不变

## 新增测试（相比上一轮 +6 个）

本次在原有 7 个测试基础上新增 6 个防御性测试：
- 空 token 返回边界
- 空错误消息边界
- 无缓存行为验证（多次调用）
- 非 Error 类型异常传播
- 不同参数值传递验证
- 请求体字段完整性验证
