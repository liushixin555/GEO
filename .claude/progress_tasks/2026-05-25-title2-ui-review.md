# title2.tsx UI 专家评审记录

**日期**: 2026-05-25
**文件**: `@uiw/react-md-editor@4.1.0/src/commands/title2.tsx`
**评审类型**: 软件 UI 专家评审

## 评审结论
⚠️ CONDITIONAL APPROVE — 3.9/10

## 问题统计
- P1 × 0 / P2 × 2 / P3 × 4

## 核心问题
1. **V-01 (P2)**: 纯文本 div 替代 SVG 图标，与 Carbon 图标体系根本性不兼容
2. **A-01 (P2)**: icon div 缺少 `role="img"` 和 `aria-hidden="true"`
3. **I18N-01 (P2)**: aria-label / title / icon 文本全部硬编码英文
4. **UX-03 (P2)**: 原生 `title` 替代 antd `<Tooltip>`
5. **UX-01 (P3)**: H3+ 行触发 H2 toggle off 导致错误降级
6. **UX-02 (P3)**: 快捷键提示未区分平台
7. **V-02 (P3)**: 纯文本图标与工具栏 SVG 图标风格不统一
8. **R-01 (P3)**: 下拉菜单项触摸目标不足

## 输出文件
- `tasks/review/title2.tsx.ui.md`
