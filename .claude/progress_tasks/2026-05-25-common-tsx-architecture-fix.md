# common.tsx 架构评审修复

**日期**: 2026-05-25
**评审文件**: `tasks/review/common.tsx.architecture.md`
**修复状态**: ✅ 全部 8 项修复完成（A-01~A-08）

## 修复内容

### A-03 (P1→P2): OCP 管线配置接口
- **新增** `PipelineConfig` 接口（`prepend`/`append` 字段）
- **新增** `pipeline` prop 到 `MarkdownPreviewProps`
- 在 `common.tsx` 和 `nohighlight.tsx` 管线构建中支持 `pipeline.prepend/append`
- 更新所有编译输出（esm/、lib/）

### A-05 (P2): 显式命名导出
- `export * from './Props'` → `export type { MarkdownPreviewProps, MarkdownPreviewRef, PipelineConfig } from './Props'`
- 源文件和类型定义文件均已更新

### A-07 (P3): 管线顺序声明式约束
- 在管线构建处添加详细的 A-07 注释，说明 10 步（common）/ 8 步（nohighlight）管线顺序
- 包含每步功能说明和安全风险标记

### 已修复项目（前次补丁）
- A-01: useMemo 缓存 rehypePlugins 数组
- A-02: MarkdownViewer 纵深防御（DOMPurify + allowElement + safeUrlTransform）
- A-04: rehypeRewriteHandle useMemo 稳定闭包
- A-06: forwardRef 命名函数 + displayName
- A-08: `||` → `??` 统一防御策略

## 变更文件
- `patches/@uiw__react-markdown-preview@5.2.1.patch` — 9 文件 patch 更新

## 测试结果
- MarkdownViewer 测试: 116/116 ✅
- rehypePlugins 安全测试: 23/23 ✅
- 组件测试总计: 251/251 ✅
- 前端构建: ✅
- Lint: ✅
