# TDD 执行报告：debug-getRmResources.ts

**文件**: `apis/utils/rmapi.utils/debug-getRmResources.ts`
**测试文件**: `tests/apis/utils/rmapi.utils/debug-getRmResources.test.ts`
**日期**: 2026-05-24

## 源码分析

CLI 调试脚本，包含两个内部函数（未导出）：
- `parseArgs()` — 解析 CLI 参数 `--token`, `--mobile`, `--password`
- `main()` — 主流程：获取 token → 请求资源 → 输出结果 → 写入 JSON 文件

依赖：
- `./index` (getRmToken, getAllRmResources)
- `fs`, `path`, `console`, `process`

## 测试策略

由于 `parseArgs` 和 `main` 未导出，采用 `jest.isolateModules` 隔离模块 + mock 全部依赖的方式：
- mock `./index` 模块（getRmToken, getAllRmResources）
- mock `fs.writeFileSync` 防止实际文件写入
- mock `process.exit` 为 no-op（避免未处理拒绝问题）
- mock `console.log/error` 捕获输出
- 默认设置 fallback mock，确保 no-op process.exit 后代码继续执行不报错

## 测试结果

```
Tests:       24 passed, 24 total
```

## 覆盖率

```
File                     | % Stmts | % Branch | % Funcs | % Lines
debug-getRmResources.ts  |     100 |      100 |     100 |     100
```

**100% 覆盖率**：语句、分支、函数、行均为 100%。

## 测试用例清单

### parseArgs (5 个)
1. 解析 `--token` 参数
2. 解析 `--mobile` 和 `--password` 参数
3. 同时提供 `--token` 和 `--mobile/--password` 时，优先使用 token
4. 无参数时返回空对象
5. `--flag` 后无值（下一个参数以 `--` 开头）时跳过

### main - token 获取 (8 个)
6. 无 token 且无凭据时 exit(1)
7. 直接使用 `--token`，不调用 getRmToken
8. 通过 mobile+password 获取 token 并记录日志
9. 记录获取到的 token 前 20 个字符
10. getRmToken 失败时 exit(1)
11. 只有 mobile 缺少 password 时 exit(1)
12. 只有 password 缺少 mobile 时 exit(1)
13. 错误输出中包含使用示例

### main - 资源获取成功 (7 个)
14. 记录总数和数据预览
15. 空结果集不显示预览
16. 超过 5 条时显示 "还有 N 条"
17. 恰好 5 条时不显示 "还有 N 条"
18. 将结果写入 JSON 文件
19. 记录耗时
20. 预览条目包含正确字段（id, name, price, taxonomy）

### main - 资源获取错误 (4 个)
21. 处理带 HTTP 响应数据的错误（status + data）
22. 处理无响应的网络错误
23. 失败时也记录耗时
24. 无 response 属性时不记录 HTTP status

## 技术要点

- `jest.isolateModules` 每次测试重新加载模块，确保 `process.argv` 变更生效
- `process.exit` mock 为 no-op 而非 throw，避免 async 函数内的未处理拒绝
- `mockWriteFileSync` 定义在 mock factory 外部，确保 `jest.isolateModules` 与测试文件共享同一引用
- 默认 fallback mock（getRmToken/getAllRmResources）防止 no-op process.exit 后代码继续执行时报错
