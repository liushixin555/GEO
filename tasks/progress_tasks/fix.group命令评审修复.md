# fix028. group.tsx 评审封装层问题修复

> 状态：✅ 已完成
> 日期：2026-05-25
> 参考评审：tasks/review/group.tsx*.md（5 份）

---

## 一、问题概述

`@uiw/react-md-editor@4.1.0` 的 `commands/group.tsx` 是工具栏命令分组工厂函数。5 份评审报告（质量 5.0/10、安全 3.2/10 FAIL、架构 4.5/10、UI 不合规、Committer 5.5/10 CONDITIONAL APPROVE）标记了 10+ 项问题。

由于文件位于 `node_modules`，不可直接修改。通过项目封装层（`MarkdownEditor.tsx` + `markdown-editor.css`）缓解可观测问题。

## 二、修复内容

| 评审问题 | 级别 | 修复方式 | 修复位置 |
|----------|------|---------|---------|
| SEC-UI-01: SVG 12px < Carbon 16px | 严重 | commandsFilter 替换为 antd FontSizeOutlined | MarkdownEditor.tsx |
| SEC-UI-02: 零 ARIA 无障碍 | 严重 | commandsFilter + annotateToolbar 注入 | MarkdownEditor.tsx |
| SEC-UI-03: 触摸目标不足 48px | 严重 | CSS @media (pointer: coarse) | markdown-editor.css |
| SEC-UI-04: 下拉菜单视觉不合规 | 严重 | Carbon 样式覆盖 | markdown-editor.css |
| Q1: `as any` 类型绕过 | CRITICAL | 不可修改 node_modules；调用方硬编码，攻击面为零 |
| Q2: 循环引用 | CRITICAL | 不可修改 node_modules；命令对象不参与序列化 |
| Q3: 冗余双重展开 | HIGH | 不可修改 node_modules；非热路径，性能可忽略 |
| Q4: options 覆盖语义歧义 | HIGH | 本项目不传 options.children，不触发 |
| Q8: `let` 应为 `const` | LOW | 不可修改 node_modules |

## 三、测试

新增 5 个测试用例（`MarkdownEditor.test.tsx`），全部 17 个测试通过：

1. `should detect group command by keyCommand` — 检测 keyCommand === 'group'
2. `should replace icon with antd FontSizeOutlined` — 图标替换
3. `should inject Chinese ARIA labels` — aria-label + aria-haspopup + title
4. `should preserve existing buttonProps when adding ARIA` — 保留已有属性
5. `should not affect non-group commands with children` — 非 group 命令不受影响

## 四、涉及文件

- `pages/components/MarkdownEditor.tsx`
- `pages/styles/markdown-editor.css`
- `tests/pages/components/MarkdownEditor.test.tsx`
