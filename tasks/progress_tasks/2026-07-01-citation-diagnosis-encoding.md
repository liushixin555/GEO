# 2026-07-01 引用诊断中文乱码修复

## 背景

引用诊断模块中部分源码字符串已经被错误编码写入，导致后端错误信息、定时任务日志、平台名称、题库路径、检测问题、自动复检 prompt、前端隐藏后台文案和 CSV 导出字段出现中文乱码。

## 修复内容

- 修复引用诊断题库读取路径，恢复 `geo-monitorv12/GEO/题库/供应商题库A.md` 和 `供应商题库B.md`。
- 修复默认检测问题和文章级检测问题，避免把乱码问题发送给 LLM。
- 修复多平台名称和别名：`豆包`、`元宝`、`千问`。
- 修复后端 controller/service/scheduler 中的中文错误信息、业务提示和运行日志。
- 修复自动复检 prompt，要求联网搜索并保留已发布文章原始 URL。
- 修复引用诊断隐藏后台页面文案、状态标签、详情抽屉、CSV 表头和导出文件名。
- 新增 `tests/apis/citation-diagnosis-encoding.test.js`，扫描引用诊断关键源码中的常见 mojibake 片段，防止回归。

## 验证

- `npx.cmd jest --config tests/apis/citation-diagnosis-encoding.jest.config.cjs` 通过。
- `rg` 扫描引用诊断相关源码未命中常见乱码片段。
- `$env:CI='true'; pnpm build` 通过。
- `$env:CI='true'; pnpm lint` 通过。

## 注意

- Windows PowerShell 默认输出编码可能会把正确 UTF-8 中文显示成乱码，排查源码编码时优先使用 `rg` 或显式设置 UTF-8 输出，避免把终端显示问题误判为源码问题。
- 本次不涉及数据库 schema 变更。
