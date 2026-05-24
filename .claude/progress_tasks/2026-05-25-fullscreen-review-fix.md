# fullscreen.tsx 评审修复

**日期**: 2026-05-25
**关联评审**: tasks/review/fullscreen.tsx.md (UI 3.4/10), fullscreen.tsx.security.md (8.5/10), fullscreen.tsx.committer.md (5.5/10)

## 修复内容

在 `pages/components/MarkdownEditor.tsx` 的 `commandsFilter` 中拦截 `fullscreen` 命令，返回覆盖后的命令对象：

| 评审编号 | 级别 | 问题 | 修复 |
|---------|------|------|------|
| U1 | CRITICAL | 按钮点击不触发全屏（shortcuts 条件守卫错误） | 移除 shortcuts 条件，仅依赖 dispatch && executeCommandState |
| U3 | HIGH | ctrlcmd+0 与浏览器冲突 | 重映射为 ctrlcmd+shift+f |
| U4 | HIGH | 12x12 图标不符合规范 | 替换为 antd FullscreenOutlined（16px） |
| U5 | MEDIUM | 英文 ARIA 标注 | 覆盖为中文 |
| U7 | MEDIUM | focus() 无条件执行 | 移到 dispatch 之后 |

## 修改文件

- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 fullscreen 覆盖 + 导入 FullscreenOutlined
- `tests/pages/components/MarkdownEditor.test.tsx`（新建）— 12 个测试用例

## 验证

- TypeScript 编译通过
- ESLint 通过
- 12 个新测试全部通过
- ArticleDetail 测试无回归（13 passed）
