# TDD 执行报告：apis/utils/index.ts（db.util + response.util）

## 测试文件
- `tests/apis/utils/db.util.test.ts`
- `tests/apis/utils/response.util.test.ts`

## 测试目标
覆盖 `apis/utils/index.ts` 导出的全部 6 个函数：
- `getPrisma()` — PrismaClient 单例管理
- `closePrisma()` — 数据库连接关闭
- `success()` — 成功响应封装
- `created()` — 创建成功（201）响应封装
- `fail()` — 错误响应封装
- `paginate()` — 分页响应封装

## 测试用例统计

### db.util.test.ts（10 用例）

| 函数 | 用例数 | 覆盖场景 |
|------|--------|----------|
| getPrisma | 6 | 首次创建实例、单例复用、development 日志配置、production 日志配置、未设置 NODE_ENV、空字符串 NODE_ENV |
| closePrisma | 4 | 正常断开并重置、prisma 为 null 时不报错、关闭后可重新创建、关闭+重开后仍为单例 |
| 交互 | 1 | 多次 open/close 循环 |

### response.util.test.ts（48 用例）

| 函数 | 用例数 | 覆盖场景 |
|------|--------|----------|
| success | 8 | 默认消息、自定义消息、string/number/boolean/array/undefined/空对象数据、返回值 |
| created | 8 | 默认消息+201状态、自定义消息、string/number/boolean/array/undefined/空对象数据、空字符串消息、返回值 |
| fail | 15 | code<400(0/100/-1)、399边界、400/401/403/404/422/429/500/503/599、空字符串消息、unicode消息、返回值 |
| paginate | 11 | 正常分页、空列表、末页部分结果、大页码、pageSize=1、返回值、string列表、单项、嵌套对象、零值页码、负值页码、MAX_SAFE_INTEGER总数 |

## 总计
- **测试套件**: 2 passed
- **测试用例**: 58 passed
- **覆盖率**: Stmts 100% / Branch 100% / Funcs 100% / Lines 100%

## 覆盖率详情

```
File              | % Stmts | % Branch | % Funcs | % Lines
------------------|---------|----------|---------|--------
db.util.ts        |     100 |      100 |     100 |    100
response.util.ts  |     100 |      100 |     100 |    100
```

## 补充用例说明
在第1轮已有 45 个用例达到 100% 覆盖率的基础上，第2轮补充了 13 个额外边界用例：
1. db.util: NODE_ENV 空字符串时的日志配置行为
2. success: number/boolean/空对象数据类型
3. created: number/boolean/空对象数据类型
4. fail: 429 限流码、599 大错误码、unicode 消息
5. paginate: 零值页码、负值页码、MAX_SAFE_INTEGER 总数

## 执行日期
2026-05-25
