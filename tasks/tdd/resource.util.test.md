# TDD 执行报告：resource.util.ts

## 测试文件
`tests/apis/utils/rmapi.utils/resource.util.test.ts`

## 被测文件
`apis/utils/rmapi.utils/resource.util.ts`

## 测试结果

| 项目 | 结果 |
|------|------|
| 测试套件 | 1 passed |
| 测试用例 | 15 passed |
| 失败 | 0 |
| 快照 | 0 |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例清单

### getRmResources（6个测试）
1. **should return resource response on success** — 成功返回资源响应
2. **should default page to 1 when not provided** — 未提供 page 参数时默认为 1
3. **should use provided page number** — 使用指定的 page 参数
4. **should call correct endpoint URL** — 验证调用正确的 API URL
5. **should propagate network errors** — 网络错误正确传播
6. **should propagate HTTP errors from axios** — HTTP 错误正确传播

### getAllRmResources（9个测试）
1. **should fetch all pages and combine results** — 获取多页并合并结果
2. **should return all items when only one page** — 单页时直接返回
3. **should create data directory with mkdirSync** — 创建数据目录
4. **should write fetched data to JSON files when no cache** — 无缓存时写入 JSON 文件
5. **should read from cache when file exists** — 缓存存在时从缓存读取
6. **should handle 3+ pages correctly** — 正确处理 3 页以上分页
7. **should propagate errors from getRmResources** — API 错误正确传播
8. **should read subsequent pages from cache in for loop** — 循环中读取后续页缓存
9. **should return empty array when response has no data** — 响应为空时返回空数组

## Mock 策略
- `axios`: mock 所有 HTTP 请求
- `fs`: mock `existsSync`、`mkdirSync`、`writeFileSync`、`readFileSync`，使用 `jest.requireActual` 保留其他方法

## 结论
覆盖率 100%，所有分支、函数、语句均已覆盖。无需额外测试用例。
