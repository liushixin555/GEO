# nohighlight.tsx Committer 评审增强

**日期**: 2026-05-26
**任务**: 增强 EVENT_ATTRS 事件处理器列表防御纵深
**评审文件**: tasks/review/nohighlight.tsx.committer.md

## 变更内容

EVENT_ATTRS 从 22 个扩展至 60+ 个事件处理器，新增：CSS 动画触发型(onanimationstart/end/iteration, ontransitionend/start/run/cancel)、剪贴板(oncopy/cut/paste)、触控(ontouchstart/move/end/cancel)、更多鼠标/指针/拖拽事件。

## 验证

- build:page 通过
- lint 通过
- MarkdownViewer 测试 116/116 通过
