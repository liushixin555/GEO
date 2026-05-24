# 2026-05-25 fullscreen.tsx 代码安全专家评审

## 变更类型
- docs: 安全评审文档

## 变更内容
- 对 `@uiw/react-md-editor/src/commands/fullscreen.tsx` 进行代码安全专家评审
- 创建评审文件 `tasks/review/fullscreen.tsx.security.md`

## 评审结论
- 安全评分: **8.5/10** — 通过
- 核心逻辑为简单 boolean 状态切换，无外部输入注入面
- 主要发现:
  1. ℹ️ `ctrlcmd+0` 与浏览器"重置缩放"快捷键冲突
  2. ⚠️ `ContextStore` 索引签名 `[key: string]: any` 允许任意属性（系统性风险）
  3. ℹ️ 全屏 API 滥用潜力（依赖下游实现）
  4. ⚠️ 按钮点击时 `shortcuts` 为空可能导致 execute 逻辑跳过（功能 Bug 待确认）
