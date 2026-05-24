# 2026-05-24 Editor.factory.tsx 软件质量评审

## 变更内容
- 对 `@uiw/react-md-editor/src/Editor.factory.tsx`（287行核心工厂）进行软件质量专家评审

## 评审结论
- **评分**: 3.3/10（需改进 NEEDS IMPROVEMENT）
- **关键发现**:
  - P0-1: 10 处 useMemo 执行副作用（dispatch），严重违反 React 渲染契约
  - P0-2: mouseover/mouseleave 事件监听器永不清理，导致内存泄漏
  - P1-1: 滚动同步除零未防护，可产生 NaN/Infinity
  - P1-2: setGroupPopFalse 直接修改 React state 对象
  - P1-3: initScroll 锁定后永不重置，滚动源判定永久固化
  - P1-4: height 变化触发连续两次 dispatch

## 涉及文件
- `tasks/review/Editor.factory.tsx.quality.md` — 评审报告（新增）

## 验证
- 纯评审任务，无代码变更
