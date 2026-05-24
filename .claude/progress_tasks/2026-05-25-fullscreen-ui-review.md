# 2026-05-25 fullscreen.tsx 软件 UI 专家评审

## 变更类型
- docs: UI 专家评审文档

## 变更内容
- 对 `@uiw/react-md-editor/src/commands/fullscreen.tsx` 进行软件 UI 专家评审
- 创建评审文件 `tasks/review/fullscreen.tsx.md`
- 评审角色: 软件 UI 专家（交互设计 · 无障碍访问 · 视觉一致性 · DESIGN.md 合规 · antd 规范）

## 评审结论
- UI 综合评分: **3.4/10** — ⚠️ CONDITIONAL APPROVE（有条件通过）
- 核心发现:
  1. 🔴 CRITICAL: execute 函数中 shortcuts 条件导致按钮点击无法触发全屏切换
  2. 🟠 HIGH: 缺少 aria-pressed 无障碍状态指示（WCAG 2.1 违规）
  3. 🟠 HIGH: ctrlcmd+0 快捷键与浏览器"重置缩放"冲突
  4. 🟠 HIGH: 图标不符合 Carbon Design 尺寸规范（12px → 应为 16/20px）
  5. 🟡 MEDIUM: ARIA 标注文本格式不一致、非中文
  6. 🟡 MEDIUM: 全屏状态切换时图标无变化
  7. 🟡 MEDIUM: api.textArea.focus() 在条件判断前无条件执行

## 问题统计
- CRITICAL × 1 / HIGH × 3 / MEDIUM × 3 / LOW × 2
