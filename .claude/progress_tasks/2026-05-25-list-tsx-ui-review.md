# list.tsx UI 专家评审

**日期**: 2026-05-25
**文件**: `@uiw/react-md-editor@4.1.0/src/commands/list.tsx`
**评审类型**: 软件 UI 专家评审
**评审结果**: ⚠️ CONDITIONAL APPROVE 5.0
**评审文件**: `tasks/review/list.tsx.ui.md`

## 评审发现

### P1 × 2
- **UX-01**: checkedListCommand 回调忽略 item/index 参数，任务列表无法正确处理已勾选项（`- [x] `），多行场景 toggle 行为异常
- **UX-02**: `makeList` 中 `state.command.prefix!` 非空断言，外部调用可能运行时崩溃

### P2 × 3
- **UX-03**: Ctrl+Shift+C 快捷键与 Chrome 开发者工具/VS Code 复制路径冲突
- **A-01**: unorderedListCommand SVG 缺少 `role="img"`（同文件 ordered/checked 均有此属性）
- **I18N-01**: 三个命令 aria-label/title 硬编码英文

### P3 × 3
- **V-01**: 图标 12×12 偏小（Carbon 建议 ≥16px）
- **V-02**: FontAwesome 实心风格与 Carbon 线条风格不一致
- **R-01**: 触摸目标不足（36×24px vs 48×48px）

## 正面评价
- `makeList` 共享函数设计优于同级命令，减少代码重复
- 有序列表 `(item, index) => `${index + 1}. `` 正确实现自动编号
- `fill="currentColor"` 可主题化
- 空行计算逻辑确保 Markdown 渲染正确

## 综合评分
3.9/10 — `makeList` 共享设计优秀，但 checkedList 回调参数忽略是功能级缺陷，unorderedList 无障碍属性缺失是文件内部不一致问题
