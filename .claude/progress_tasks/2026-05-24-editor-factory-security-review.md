# Editor.factory.tsx 代码安全专家评审

**日期**: 2026-05-24
**文件**: `tasks/review/Editor.factory.tsx.security.md`

## 变更内容

- 完成 `@uiw/react-md-editor/src/Editor.factory.tsx` 代码安全专家评审
- 评分: C+/5.8（满分10）
- 发现: HIGH×3 + MEDIUM×4 + LOW×3

## 关键发现

| 编号 | 严重性 | 问题 |
|------|--------|------|
| #1 | HIGH | ContextStore `[key: string]: any` 索引签名 — 原型污染/状态注入 |
| #2 | HIGH | useImperativeHandle 泄露完整状态+DOM+dispatch |
| #3 | HIGH | 10处 useMemo 用于副作用 — React语义违规，并发模式不可预测 |
| #4 | MEDIUM | setGroupPopFalse 原地突变对象 |
| #5 | MEDIUM | 事件监听器泄漏（useMemo添加无清理） |
| #6 | MEDIUM | components.preview 回调获得 dispatch 引用 |
| #7 | MEDIUM | onChange 暴露完整内部状态 |
| #8 | LOW | props `{...other}` 扩散未过滤 |
| #9 | LOW | 滚动事件 dispatch 洪水（无节流） |
| #10 | LOW | 初始化 useEffect 展开完整 state |

## 与已有关联评审的关系

- `Context.tsx.security.md`（1.6分）— #1 索引签名问题在此文件中被放大（dispatch 无约束）
- `Editor.factory.tsx.quality.md`（3.3分）— #3 useMemo副作用在质量评审中已识别
- `Editor.factory.tsx.md`（3.1分架构评审）— 巨型组件问题导致安全隐患难以隔离
