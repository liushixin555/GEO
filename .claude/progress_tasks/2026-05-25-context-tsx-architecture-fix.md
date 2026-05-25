# Context.tsx 架构评审修复

**日期**: 2026-05-25
**关联评审**: `tasks/review/Context.tsx.architecture.md`（3.0/10）

## 修复内容

### P0-1: 移除 `[key: string]: any` 索引签名
- `ContextStore` 接口中的 `[key: string]: any` 导致所有类型声明失去意义
- 移除后恢复 TypeScript 类型安全：拼写错误、属性类型推断、类型窄化、重构安全网全部恢复

### P2-2: ExecuteCommandState 显式类型定义
- 原 `Pick<ContextStore, 'fullscreen' | 'preview' | 'highlightEnable'>` 受索引签名污染，属性类型为 `any`
- 改为显式 `interface ExecuteCommandState` 定义，属性类型精确

### reducer 返回类型简化
- 原返回类型展开为 `{ [x: string]: any; ... }` 冗余声明
- 简化为 `ContextStore`，随接口修复自动获得正确类型

## 修改文件

补丁文件：`patches/@uiw+react-md-editor+4.1.0.patch`

| 文件 | 修改内容 |
|------|---------|
| `src/Context.tsx` | 移除索引签名 + ExecuteCommandState 显式定义 |
| `esm/Context.d.ts` | 同步类型修复 + reducer 返回类型简化 |
| `lib/Context.d.ts` | 同步类型修复 + reducer 返回类型简化 |

## 未修复项（封装层缓解）

| 编号 | 问题 | 原因 | 缓解方式 |
|------|------|------|---------|
| P0-2 | Reducer 无 Action 区分 | 破坏 13 个消费端文件 | MarkdownEditor.tsx commandsFilter 封装 |
| P0-3 | DOM 引用混入 Context | 破坏 8+ ref 注册点 | MarkdownEditor.tsx 隔离 + useEffect 清理 |
| P1-1 | dispatch 混入状态接口 | 破坏所有 useContext 消费端 | MarkdownEditor.tsx 不暴露 ContextStore |
| P1-2 | 全 optional 无默认值 | 破坏消费端类型检查 | MarkdownEditor.tsx 提供完整默认值 |
| P2-1 | 单一巨型 Context | 需重构全部 Provider | memo + useCallback 减少 re-render |

## 验证结果

- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
- MarkdownEditor 129 测试 ✅ 全部通过
