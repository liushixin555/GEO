# common.tsx 质量评审修复

日期: 2026-05-25
评审文件: tasks/review/common.tsx.quality.md
修复范围: @uiw/react-markdown-preview 第三方库 patch

## 修复项
- Q-01 P1 性能: nohighlight.tsx + common.tsx 添加 useMemo 稳定插件数组
- Q-05 P2 性能: 提取 rewriteFn 到独立 useMemo 闭包稳定化
- Q-04 P2 架构: 添加双重 rehypeRaw 注释说明（本项目 nohighlight 无此问题）
- Q-08 P3 可维护性: 添加插件顺序注释

## 未修复项（本项目无需修复）
- Q-02 P1 安全: nohighlight 不含 rehypeRaw
- Q-03 P2 安全: MarkdownViewer 未传入自定义 rehypePlugins
- Q-06 P3 架构: 用户插件位置固定是库设计限制
- Q-07 P3 安全: content 来源受控

## 修改文件
- patches/@uiw__react-markdown-preview@5.2.1.patch
- pnpm-lock.yaml（patch hash 更新）

## 验证
- pnpm build OK
- pnpm lint OK
- MarkdownViewer 79 测试全通过
