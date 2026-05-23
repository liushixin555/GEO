# TDD 执行报告：debug-getRmResources.ts

## 源文件
`apis/utils/rmapi.utils/debug-getRmResources.ts`

## 测试文件
`tests/apis/utils/rmapi.utils/debug-getRmResources.test.ts`

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
```

## 覆盖率

| 指标       | 覆盖率 |
|-----------|-------|
| 语句 (Stmts)  | 100%  |
| 分支 (Branch) | 100%  |
| 函数 (Funcs)  | 100%  |
| 行 (Lines)   | 100%  |

## 测试用例清单

### parseArgs（5 个测试）
1. 解析 `--token` 参数
2. 解析 `--mobile` 和 `--password` 参数
3. `--token` 优先于 `--mobile`/`--password`
4. 无参数时返回空对象并报错
5. 标志位后无值时跳过（下一个参数以 `--` 开头）

### main - token 获取（8 个测试）
6. 无 token 且无凭证时 exit(1)
7. 使用提供的 token 直接调用，不调用 getRmToken
8. 通过 mobile+password 获取 token 并打印进度
9. 打印 token 前 20 个字符
10. getRmToken 失败时 exit(1)
11. 有 mobile 无 password 时 exit(1)
12. 有 password 无 mobile 时 exit(1)
13. 错误输出中包含使用示例

### main - 资源请求成功（7 个测试）
14. 打印总数和前 5 条数据预览
15. 空结果不显示预览
16. 超过 5 条时显示"还有 N 条"
17. 恰好 5 条时不显示"还有 N 条"
18. 结果写入 JSON 文件
19. 成功时打印耗时
20. 预览显示正确字段（id、name、price、taxonomy）

### main - 资源请求失败（4 个测试）
21. 带 HTTP 响应的错误（打印 status 和 data）
22. 不带响应的网络错误
23. 失败时也打印耗时
24. 无 response 时不打印 HTTP status

## 结论

源文件为手工调测脚本，包含 `parseArgs`（命令行参数解析）和 `main`（token 获取 + 资源请求 + 文件输出）两个未导出函数。测试通过 `jest.isolateModules` + `process.argv` 模拟实现完整覆盖。**无需补全额外测试用例，100% 覆盖率已达标。**
