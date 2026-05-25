# common.tsx 质量评审修复

日期: 2026-05-25
评审文件: tasks/review/common.tsx.quality.md
修复范围: @uiw/react-markdown-preview 第三方库 patch

## 修复项
- Q-01 P1 性能: useMemo 稳定插件数组（前期已修复）
- Q-04 P2 架构: **本次修复** — 强制 skipHtml 阻止 preview.tsx 重复添加 rehype-raw
  - 修改 common.tsx/index.tsx/nohighlight.tsx 三个入口的 forwardRef 返回
  - 覆盖 esm/ 和 lib/ 编译产物共 9 个文件
  - 重新生成 patches/@uiw+react-markdown-preview+5.2.1.patch
- Q-05 P2 性能: useMemo 闭包稳定化（前期已修复）
- Q-08 P3 可维护性: 插件顺序注释（前期已修复）

## 不需要修复项（评审确认安全）
- Q-02 P1 安全: nohighlight 不含 rehypeRaw + DOMPurify 纵深防御
- Q-03 P2 安全: MarkdownViewer 未传入自定义 rehypePlugins
- Q-06 P3 架构: PipelineConfig prepend/append 已支持自定义位置
- Q-07 P3 安全: rehypeRewrite 清理 + content 来源受控

## 修改文件
- patches/@uiw+react-markdown-preview+5.2.1.patch（重新生成）

## 验证
- pnpm build OK
- pnpm lint OK
- 9054 测试通过 / MarkdownViewer.test.tsx 通过
