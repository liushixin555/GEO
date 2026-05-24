# 2026-05-25 link.tsx 软件质量专家评审

## 变更摘要
- 新增 `tasks/review/link.tsx.md` — @uiw/react-md-editor@4.1.0 link 命令的软件质量专家评审报告

## 评审结论
- **APPROVE WITH COMMENTS** — 综合评分 6.4/10
- H1: SVG `data-name="italic"` 应为 `"link"`（复制粘贴 Bug）
- M1: 2 处非空断言 `state.command.prefix!` 绕过类型系统
- M2: URL 检测 `includes('http')` 逻辑粗糙，会误判 "httpry" 等文本
- M3: 分支 A 硬编码 `'[]('` / `')'` 与命令配置 `prefix/suffix` 行为不对称
- L1-L3: SVG 缺少 `<title>`、let 变量重赋值、模板插入不选中占位符

## 建议
- 不 fork 修改第三方库，向上游提交 Issue 报告 H1
- 在项目文档记录 URL 检测的已知限制
