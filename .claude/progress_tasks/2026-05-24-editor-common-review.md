# 2026-05-24 Editor.common.tsx 软件质量评审

## 变更内容
- 对 `@uiw/react-md-editor@4.1.0` 的 `Editor.common.tsx` 进行软件质量专家评审
- 评审报告写入 `tasks/review/Editor.common.tsx.md`

## 评审结果
- **综合评分：7.7/10**（✅ 通过，附建议）
- 本文件（7行）质量极高：工厂+依赖注入模式，职责单一，零副作用
- 上游工厂 `Editor.factory.tsx` 存在隐患：
  - C-1：事件监听器泄漏（textareaWarp mouseover/mouseleave 未 removeEventListener）
  - C-2：useMemo 滥用执行副作用（10处），React 18 Strict Mode 下可能双重 dispatch
  - M-1：废弃属性 `visiableDragbar`（拼写错误）未标记 @deprecated
  - M-2：useImperativeHandle 暴露完整内部 state + dispatch，违反最小暴露原则
  - M-3：滚动同步 scale 可为 0/Infinity 导致 NaN

## 产出文件
- `tasks/review/Editor.common.tsx.md`（评审报告）
