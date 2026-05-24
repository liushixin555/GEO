# TDD 执行报告：auth.util.ts

## 源文件
`apis/utils/rmapi.utils/auth.util.ts`

## 测试文件
`tests/apis/utils/rmapi.utils/auth.util.test.ts`

## 测试结果

```
PASS tests/apis/utils/rmapi.utils/auth.util.test.ts (4.478 s)
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
      RM_API_KEY edge cases
        ✓ should throw error when RM_API_KEY env var is not set
        ✓ should throw error when RM_API_KEY is empty string
      token edge cases
        ✓ should return long token string
        ✓ should return token with unicode and special characters
      error message edge cases
        ✓ should throw with unicode error message
        ✓ should throw with very long error message
      input parameter variations
        ✓ should pass special characters in mobile and password
        ✓ should pass empty mobile and password strings without validation
        ✓ should pass unicode mobile and password
      concurrent calls
        ✓ should handle concurrent getRmToken calls independently

Tests:       23 passed, 23 total
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
| 2 | should send correct request body with fixed fields | 验证请求体包含所有固定字段 |
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
| 14 | should throw error when RM_API_KEY env var is not set | 环境变量未配置时抛出错误 |
| 15 | should throw error when RM_API_KEY is empty string | 环境变量为空字符串时抛出错误 |
| 16 | should return long token string | 返回超长 token（2048 字符） |
| 17 | should return token with unicode and special characters | 返回含特殊字符/unicode 的 token |
| 18 | should throw with unicode error message | unicode 错误消息正确传递 |
| 19 | should throw with very long error message | 超长错误消息（500 个中文字符重复）正确传递 |
| 20 | should pass special characters in mobile and password | 特殊字符参数正确传递 |
| 21 | should pass empty mobile and password strings without validation | 空 mobile/password 参数正确传递 |
| 22 | should pass unicode mobile and password | unicode 参数正确传递 |
| 23 | should handle concurrent getRmToken calls independently | 并发调用独立处理 |

## 测试策略

- **Mock axios**: 使用 `jest.mock('axios')` 模拟 HTTP 请求，隔离外部依赖
- **正向测试**: 验证成功场景下 token 正确返回、请求参数完整
- **逆向测试**: 验证认证失败时错误消息正确传递
- **异常测试**: 验证网络错误和超时错误正确传播
- **边界测试**: 空 token、空消息、非 Error 类型异常、无缓存行为
- **参数验证**: 不同 mobile/password 值正确传递，固定字段不变
- **环境变量边界**: undefined 和空字符串两种缺失场景
- **特殊字符**: unicode/emoji/特殊字符在 token、错误消息、输入参数中的处理
- **并发安全**: Promise.all 并发调用独立处理

## 变更历史

| 轮次 | 用例数 | 新增 | 说明 |
|------|--------|------|------|
| R1 | 7 | 7 | 初始测试：基本成功/失败/异常场景 |
| R2 | 13 | +6 | 防御性测试：空 token/消息、无缓存、非 Error 异常、参数验证、字段完整性 |
| R3 | 23 | +10 | 边界增强：空字符串 API_KEY、超长/特殊字符 token、unicode 错误消息、特殊字符参数、空参数、并发调用 |
