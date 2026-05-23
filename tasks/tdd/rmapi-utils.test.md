# rmapi.utils 模块 TDD 执行报告

## 测试目标

对 `apis/utils/rmapi.utils/` 下的所有模块进行单元测试补全，确保 100% 覆盖率。

## 源文件

| 文件 | 导出功能 |
|------|----------|
| `auth.util.ts` | `getRmToken` - 获取 rmapi 认证 token |
| `resource.util.ts` | `getRmResources` - 获取资源列表（单页）, `getAllRmResources` - 获取所有资源（自动分页+缓存） |
| `order.util.ts` | `submitRmOrder` - 提交订单 |
| `index.ts` | 统一导出入口 |

## 测试文件

| 测试文件 | 测试数量 | 覆盖文件 |
|----------|----------|----------|
| `auth.util.test.ts` | 7 | auth.util.ts |
| `resource.util.test.ts` | 15 | resource.util.ts |
| `order.util.test.ts` | 8 | order.util.ts |
| `debug-getRmResources.test.ts` | 24 | debug-getRmResources.ts |

## 测试覆盖详情

### auth.util.ts (7 个测试)

- 成功认证返回 token
- 验证请求体包含固定字段（identity, captcha_token, captcha, api_key）
- success=false 时抛出错误（用户名密码错误）
- 错误消息从响应中提取（账号已锁定）
- 网络错误传播
- 超时错误传播
- 验证正确的 endpoint URL

### resource.util.ts (15 个测试)

**getRmResources (6 个)**
- 成功返回资源列表
- 默认 page=1
- 使用指定的 page 参数
- 验证正确的 endpoint URL
- 网络错误传播
- HTTP 错误传播

**getAllRmResources (9 个)**
- 多页自动分页并合并结果
- 单页直接返回
- 创建数据目录 mkdirSync
- 写入 JSON 缓存文件
- 从缓存读取第 1 页
- for 循环中从缓存读取后续页
- 3+ 页正确处理
- 错误传播
- 空数据返回空数组

### order.util.ts (8 个测试)

- 成功提交订单返回响应
- 验证请求体参数正确
- 验证正确的 endpoint URL
- success=false 时仍返回响应
- 网络错误传播
- 超时错误传播
- HTTP 错误传播
- 复杂数据类型响应处理

### debug-getRmResources.ts (24 个测试 - 已有)

- parseArgs 参数解析
- main 函数 token 获取流程
- 资源获取成功/失败场景

## 测试结果

```
Test Suites: 4 passed, 4 total
Tests:       54 passed, 54 total
```

## 覆盖率

```
File                     | % Stmts | % Branch | % Funcs | % Lines |
-------------------------|---------|----------|---------|---------|
All files                |     100 |      100 |     100 |     100 |
 auth.util.ts            |     100 |      100 |     100 |     100 |
 debug-getRmResources.ts |     100 |      100 |     100 |     100 |
 order.util.ts           |     100 |      100 |     100 |     100 |
 resource.util.ts        |     100 |      100 |     100 |     100 |
```

**100% 覆盖率** - 语句、分支、函数、行覆盖率均为 100%。

## 新增测试文件

- `tests/apis/utils/rmapi.utils/resource.util.test.ts` (15 个测试)
- `tests/apis/utils/rmapi.utils/order.util.test.ts` (8 个测试)

## 已有测试文件（无需修改）

- `tests/apis/utils/rmapi.utils/auth.util.test.ts` (7 个测试)
- `tests/apis/utils/rmapi.utils/debug-getRmResources.test.ts` (24 个测试)
