# 2026-05-24 useCopied.tsx 评审修复

## 变更概述
根据 4 份评审报告（架构评审、安全评审、UI 评审、Committer 评审）修复 `@uiw/react-markdown-preview` 的 `useCopied.tsx`。

## 修复的问题

### 架构修复
- **A1 CRITICAL**: useCallback 稳定化 handle 引用，修复事件监听器引用断裂
- **A2 HIGH**: useRef 追踪 setTimeout，组件卸载时清理定时器
- **A4 MEDIUM**: closest() 替代递归 DOM 遍历
- **A6 MEDIUM**: useEffect 内捕获 container.current 到局部变量
- **A8 LOW**: 移除冗余的先移除后添加 workaround

### 安全修复
- **S2 MEDIUM**: 添加 MAX_COPY_LENGTH (100KB) 限制
- **S3 MEDIUM**: 检查 copyTextToClipboard 的 success 参数，区分成功/失败
- **S4 MEDIUM**: instanceof HTMLElement 类型守卫替代不安全断言
- **S6 LOW**: closest() 消除栈溢出风险

### UI 修复
- **UI-P1-02**: 复制失败时显示 copy-failed class，而非虚假成功
- **UI-P1-03**: COPY_FEEDBACK_DURATION 提取为常量
- **UI-P3-01**: 快速点击保护（active 状态时跳过）

### Carbon/antd 合规
- CSS 覆盖：.copied 圆角 0、.copied.active 背景色 Carbon Blue
- CSS ::after "已复制" 文字反馈
- CSS .copy-failed 错误状态样式

## 修改的文件
| 文件 | 变更 |
|------|------|
| `node_modules/.../src/plugins/useCopied.tsx` | 源码修复 |
| `node_modules/.../esm/plugins/useCopied.js` | ESM 编译产物修复 |
| `node_modules/.../lib/plugins/useCopied.js` | CJS 编译产物修复 |
| `pages/styles/markdown-viewer.css` | Carbon 规范 CSS 覆盖 |
| `tests/pages/hooks/useCopied.test.tsx` | 27 项测试用例 |

## 测试结果
- useCopied 测试：27/27 通过
- MarkdownViewer 测试：28/28 通过
- 前端构建：成功
