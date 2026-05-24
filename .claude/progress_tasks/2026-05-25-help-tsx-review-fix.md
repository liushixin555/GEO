# help.tsx 评审封装层修复

**日期**: 2026-05-25
**关联评审**: tasks/review/help.tsx.*.md（安全5.5/10、UI 5.0/10、架构5.5/10、质量6.0/10、Committer 5.0/10）

## 修复内容

将 MarkdownEditor.tsx 中 help 命令从 `return false`（直接过滤）改为安全覆盖，修复所有 P0-P3 级问题：

| 优先级 | 问题 | 修复方式 |
|--------|------|---------|
| P0 | window.open 缺少 noopener — 反向标签劫持 | `windowFeatures` 改为 `'noopener,noreferrer'` |
| P1 | 弹窗被拦截时静默失败 | 检查返回值，降级为 `window.location.href` |
| P2 | 英文 ARIA 标注 | 中文 `aria-label: '打开 Markdown 语法帮助（外部链接）'` |
| P2 | SVG 12px 图标过小 | 替换为 antd `QuestionCircleOutlined`（fontSize: 16） |
| P3 | 无键盘快捷键 | 添加 `shortcuts: 'f1'` |
| P3 | 无外部链接视觉标识 | title 中标注"外部链接" |

## 涉及文件

- `pages/components/MarkdownEditor.tsx` — commandsFilter help 命令安全覆盖
- `tests/pages/components/MarkdownEditor.test.tsx` — 6 个新增 help 测试

## 测试结果

22 个 MarkdownEditor 测试全部通过（+6 新增 help 安全覆盖测试）。
