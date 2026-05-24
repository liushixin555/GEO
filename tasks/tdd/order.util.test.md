# TDD 执行报告：order.util.ts

## 测试文件
`tests/apis/utils/rmapi.utils/order.util.test.ts`

## 被测文件
`apis/utils/rmapi.utils/order.util.ts`

## 测试目标

`apis/utils/rmapi.utils/order.util.ts` — 提交订单到 rmapi 的工具函数。

## 源文件分析

- **导出函数**: `submitRmOrder(params: RmOrderParams): Promise<RmOrderResponse>`
- **接口**: `RmOrderParams` (token, title, content, resource_id), `RmOrderResponse` (success, message, data, status)
- **实现**: 调用 `axios.post` 发送到 `https://rmapi.ruan.net/api/news_order`，返回 `res.data`

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Snapshots:   0 total
```

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例清单（25个）

### 基础功能（12个）
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

### 补充测试（13个）
| # | 测试用例 | 覆盖场景 |
|---|---------|---------|
| 13 | 验证模块导出 | 确认 submitRmOrder 为函数 |
| 14 | 大数值 resource_id | Number.MAX_SAFE_INTEGER 边界 |
| 15 | 负数 resource_id | -1 负数边界 |
| 16 | Unicode 内容在所有文本字段 | 中文、日文、韩文、emoji |
| 17 | 需转义的特殊字符 | HTML/JS/引号/换行 |
| 18 | 超长内容字符串 | 100000字符压力测试 |
| 19 | 并发独立调用 | Promise.all 三次并发调用 |
| 20 | ECONNREFUSED 错误传播 | 连接拒绝错误码 |
| 21 | 多种 HTTP 状态码响应 | 200/201/204/301 |
| 22 | axios.post 每次调用仅触发一次 | 单次调用验证 |
| 23 | undefined data 字段响应 | data 为 undefined |
| 24 | 数字零 data 响应 | data 为 0 |
| 25 | 空字符串 message 响应 | message 为空串 |

## Mock 策略
- `axios`: `jest.mock('axios')` 模拟所有 HTTP 请求
- `beforeEach`: `jest.clearAllMocks()` 清理所有 mock 状态
- 使用 `mockResolvedValueOnce` / `mockRejectedValueOnce` 精确控制每次调用

## 测试策略

- **正向测试**: 验证成功提交、正确参数、返回值结构
- **反向测试**: 网络错误、超时、HTTP 错误、业务失败、ECONNREFUSED
- **边界测试**: 空字符串字段、null data、非 Error rejection、大数值、负数、超长字符串
- **国际化测试**: Unicode 字符、emoji、特殊字符转义
- **并发测试**: Promise.all 多次并发调用独立性
- **数据类型测试**: null、undefined、0、复杂对象、空字符串

## 结论

测试覆盖率 100%，25 个测试用例全面覆盖了正常路径、错误路径、边界情况、国际化、并发安全和各种数据类型。
