# 2026-05-25 strikeThrough.tsx 评审修复

## 变更概述
基于 4 份专家评审报告（安全 7.8/10、架构 7.5/10、UI 6.5/10、Committer 7.8/10），修复 `@uiw/react-md-editor` 的 `strikeThrough.tsx` 中的 8 项问题。

## 修复内容
| 编号 | 级别 | 问题 | 修复 |
|------|------|------|------|
| S1/S2 | MEDIUM | `prefix!` 非空断言 | 防御性空值守卫 + 类型收窄 |
| S3 | LOW | 无 try-catch 错误边界 | 添加 try-catch |
| S5 | LOW | SVG data-name 信息泄露 | 移除属性 |
| S6/U2 | HIGH/INFO | 英文 aria-label/title | 改为中文 |
| U3 | MEDIUM | 快捷键格式不一致 | 统一 Ctrl+Shift+X |
| U4 | MEDIUM | SVG 缺 aria-hidden | 添加 aria-hidden="true" |
| P3-LOW-02 | LOW | state1 命名不语义 | 重命名为 selectedState |

## 修改文件
- `node_modules/.../react-md-editor/src/commands/strikeThrough.tsx`
- `node_modules/.../react-md-editor/esm/commands/strikeThrough.js`
- `node_modules/.../react-md-editor/lib/commands/strikeThrough.js`

## 验证
- TypeScript 编译：通过
- ESLint：通过
- 测试：34 PASS / 2 FAIL（预存在问题）
