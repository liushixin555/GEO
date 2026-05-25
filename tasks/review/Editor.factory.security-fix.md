# 安全评审修复记录：@uiw/react-md-editor Editor.factory.tsx

**评审文件**: `tasks/review/Editor.factory.tsx.security.md`
**修复日期**: 2026-05-26
**关联文件**:
- `patches/@uiw+react-md-editor+4.1.0.patch` — 第三方库补丁（核心修复）
- `patches/@uiw__react-md-editor@4.1.0.patch` — pnpm patchedDependencies 副本
- `pages/components/MarkdownEditor.tsx` — 封装层注释更新
- `pnpm-lock.yaml` — patch hash 更新

## 修复清单

| 编号 | 严重性 | 发现 | 修复方式 | 状态 |
|------|--------|------|----------|------|
| #1 | HIGH | ContextStore `[key: string]: any` 索引签名 | src/Context.tsx 移除索引签名；reducer 添加白名单过滤 | ✅ |
| #2 | HIGH | useImperativeHandle 泄露完整状态 | 封装层已隔离（MarkdownEditorRef 仅暴露安全 API） | ✅ (封装层) |
| #3 | HIGH | useMemo 执行 dispatch 副作用 | Editor.factory 所有 useMemo dispatch 替换为 useEffect | ✅ |
| #4 | MEDIUM | setGroupPopFalse 原地突变 | 改为 `Object.fromEntries` 不可变实现 | ✅ |
| #5 | MEDIUM | 事件监听器泄漏（mouseover/mouseleave） | 改用 useEffect + cleanup 函数 | ✅ |
| #6 | MEDIUM | preview 回调获得 dispatch | 封装层不传 components.preview | ✅ (封装层) |
| #7 | MEDIUM | onChange 暴露完整状态 | 封装层仅传递 value: string | ✅ (封装层) |
| #8 | LOW | props 扩散 | 封装层使用受控 div 容器 | ✅ (封装层) |
| #9 | LOW | 滚动 dispatch 洪水 | 未修复（LOW 优先级，React 批处理已有缓解） | ⚠️ |
| #10 | LOW | 初始化 useEffect 展开 stale state | 仅 dispatch 最小必要字段 | ✅ |

## 修改的文件格式

Patch 同时覆盖 src/（TypeScript 源码）、esm/（Vite 运行时）、lib/（CommonJS）三种格式。
