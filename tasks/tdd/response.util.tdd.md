# TDD 执行报告：apis/utils/response.util.ts

## 测试目标

`apis/utils/response.util.ts` 提供4个HTTP响应工具函数：

| 函数 | 功能 | 测试数量 |
|------|------|---------|
| `success<T>` | 成功响应（code:0） | 6 |
| `created<T>` | 资源创建响应（status:201） | 6 |
| `fail` | 错误响应（自动status码） | 12 |
| `paginate<T>` | 分页响应 | 9 |
| **合计** | | **33** |

## 测试文件

- `tests/apis/utils/response.util.test.ts`（34个测试，含1个describe）

## 测试用例详情

### `success` 函数（6个测试）
1. 返回 code:0 + 默认消息"操作成功" + 数据
2. 支持自定义消息
3. 处理字符串数据
4. 处理数组数据
5. 处理 undefined 数据
6. 返回 res.json 的结果

### `created` 函数（6个测试）
1. 返回 status:201 + code:0 + 默认消息"创建成功" + 数据
2. 支持自定义消息
3. 处理 undefined 数据
4. 处理数组数据
5. 处理空字符串消息
6. 返回 res.json 的结果

### `fail` 函数（12个测试）
1. code < 400（code=0）时 status 为 400
2. code = 400 时 status 为 400
3. code = 401 时 status 为 401
4. code = 403 时 status 为 403
5. code = 404 时 status 为 404
6. code = 500 时 status 为 500
7. code = 100 时 status 为 400
8. code = 422 时 status 为 422
9. code = -1 负数错误码 → status 400
10. code = 503 服务不可用
11. 处理空字符串消息
12. 返回 res.json 链式调用结果
13. code = 399 边界值测试（<400 → status 400）

### `paginate` 函数（9个测试）
1. 返回完整分页结构（list, total, page, pageSize）
2. 处理空列表
3. 处理最后一页部分结果
4. 处理大页码
5. 处理 pageSize = 1
6. 返回 res.json 的结果
7. 处理字符串列表项
8. 处理单条数据 total=1
9. 处理嵌套对象数据

## 覆盖率分析

| 指标 | 覆盖率 |
|------|--------|
| 语句（Statements） | 100% |
| 分支（Branches） | 100% |
| 函数（Functions） | 100% |
| 行（Lines） | 100% |

## 执行结果

```
Test Suites: 1 passed, 1 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        7.423 s
```

全部测试通过，无失败用例。四项覆盖率指标均为100%。

## 测试策略

- **mockResponse()**: 创建模拟 Express Response 对象，mock `json()` 和 `status()` 方法
- **边界值测试**: fail 函数覆盖 code<400、code=400、code=399 边界
- **数据类型覆盖**: string、array、object、undefined、null、嵌套对象
- **返回值验证**: 每个函数均验证返回 res 对象（链式调用）
