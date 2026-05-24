# TDD 执行报告：resource.util.ts

## 测试文件
`tests/apis/utils/rmapi.utils/resource.util.test.ts`

## 被测文件
`apis/utils/rmapi.utils/resource.util.ts`

## 测试结果

| 项目 | 结果 |
|------|------|
| 测试套件 | 1 passed |
| 测试用例 | 25 passed |
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

### getRmResources — 基础功能（6个）
1. **should return resource response on success** — 成功返回资源响应
2. **should default page to 1 when not provided** — 未提供 page 参数时默认为 1
3. **should use provided page number** — 使用指定的 page 参数
4. **should call correct endpoint URL** — 验证调用正确的 API URL
5. **should propagate network errors** — 网络错误正确传播
6. **should propagate HTTP errors from axios** — HTTP 错误正确传播

### getAllRmResources — 基础功能（9个）
7. **should fetch all pages and combine results** — 获取多页并合并结果
8. **should return all items when only one page** — 单页时直接返回
9. **should create data directory with mkdirSync** — 创建数据目录
10. **should write fetched data to JSON files when no cache** — 无缓存时写入 JSON 文件
11. **should read from cache when file exists** — 缓存存在时从缓存读取
12. **should handle 3+ pages correctly** — 正确处理 3 页以上分页
13. **should propagate errors from getRmResources** — API 错误正确传播
14. **should read subsequent pages from cache in for loop** — 循环中读取后续页缓存
15. **should return empty array when response has no data** — 响应为空时返回空数组

### getAllRmResources — 边界测试（6个）
16. **should throw when cached JSON is corrupted** — 损坏的缓存 JSON 抛出解析错误
17. **should use only cache when all pages are cached** — 所有页面缓存时不发起 API 请求
18. **should handle mixed cache across multiple pages** — 混合缓存场景（页1无缓存→API、页2有缓存→读取、页3无缓存→API）
19. **should throw when page 2 fetch fails after page 1 succeeded** — 页2 API 失败时正确传播 ECONNREFUSED 错误
20. **should write JSON with 2-space indentation** — 验证写入文件的 JSON 格式化正确
21. **should handle many pages (5 pages)** — 处理 5 页分页场景

### getRmResources — 边界测试（4个）
22. **should handle token with special characters** — Token 含 Unicode/特殊字符时正确传递
23. **should return response with all RmResourceItem fields** — 完整字段响应（17个字段全覆盖）
24. **should propagate timeout error from axios** — axios 超时错误（ECONNABORTED）正确传播
25. **should handle page number 0** — page=0 边界值正确透传

## Mock 策略
- `axios`: mock 所有 HTTP 请求（`jest.mock('axios')`）
- `fs`: mock `existsSync`、`mkdirSync`、`writeFileSync`、`readFileSync`，使用 `jest.requireActual` 保留其他方法

## 结论
覆盖率 100%（Statements/Branches/Functions/Lines），25个用例覆盖基础功能15个 + 边界测试10个，所有分支、函数、语句均已覆盖。
