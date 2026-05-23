# TDD 执行报告：order.util.ts

## 测试目标

`apis/utils/rmapi.utils/order.util.ts` — 提交订单到 rmapi 的工具函数。

## 源文件分析

- **导出函数**: `submitRmOrder(params: RmOrderParams): Promise<RmOrderResponse>`
- **接口**: `RmOrderParams` (token, title, content, resource_id), `RmOrderResponse` (success, message, data, status)
- **实现**: 调用 `axios.post` 发送到 `https://rmapi.ruan.net/api/news_order`，返回 `res.data`

## 测试用例（12个）

| # | 测试用例 | 覆盖场景 |
|---|---------|---------|
| 1 | 成功提交订单返回完整响应 | 正常路径：success=true |
| 2 | 发送正确的请求体 | 验证 axios.post 参数 |
| 3 | 调用正确的端点 URL | 验证 URL 正确性 |
| 4 | success=false 时仍返回响应 | API 业务层失败 |
| 5 | 传播网络错误 | Network Error |
| 6 | 传播超时错误 | timeout exceeded |
| 7 | 传播 HTTP 错误（含 response） | 500 错误 |
| 8 | 处理复杂响应数据类型 | 嵌套对象、数组 |
| 9 | 处理 null data 响应 | data 为 null |
| 10 | 处理空字符串字段 | token/title/content 为空, resource_id 为 0 |
| 11 | 传播非 Error 类型的 rejection | 字符串 rejection |
| 12 | 返回 res.data 原始对象 | 验证返回值引用一致性 |

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试策略

- **Mock**: `jest.mock('axios')` 模拟 HTTP 请求
- **正向测试**: 验证成功提交、正确参数、返回值结构
- **反向测试**: 网络错误、超时、HTTP 错误、业务失败
- **边界测试**: 空字符串字段、null data、非 Error rejection
- **新增 4 个测试**: null data、空字段、非 Error rejection、返回值引用一致性

## 结论

测试覆盖率 100%，12 个测试用例全面覆盖了正常路径、错误路径和边界情况。
