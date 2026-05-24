# useCopied.tsx Committer 审核专家评审

**日期**: 2026-05-24
**类型**: 代码评审（Committer 审核专家）
**文件**: `tasks/review/useCopied.tsx.committer.md`

## 变更内容

完成 `@uiw/react-markdown-preview/src/plugins/useCopied.tsx` 的 Committer 审核专家评审报告。

### 评审结论：有条件通过（CONDITIONAL APPROVE）

### 关键发现

| 维度 | 评分 | 判定 |
|------|------|------|
| 依赖准入评估 | 8/10 | 通过 |
| API 契约正确性 | 7/10 | 通过 |
| 项目防御充分性 | 7/10 | 通过 |
| 项目规范遵循 | 3/10 | 不通过 |
| 生产就绪度 | 6/10 | 有条件通过 |
| 上游风险可控性 | 6/10 | 有条件通过 |

### 主要审核意见

1. **闭包陈旧引用**（HIGH）：`handle` 不在 useEffect 依赖数组中，eslint-disable 压制警告。实际不影响功能（handle 无外部依赖）
2. **setTimeout 未清理**（MEDIUM）：组件卸载后超时仍持有 DOM 引用，轻微内存泄漏
3. **复制失败无反馈**（MEDIUM）：copyTextToClipboard 失败时仍显示 active 状态
4. **execCommand 废弃 API**（MEDIUM）：上游依赖 copy-to-clipboard 使用废弃 API
5. **DESIGN.md 不合规**（HIGH）：复制按钮样式/反馈与 Carbon/antd 规范不一致

### 合并前必须完成

- CSS 覆盖 `.copied.active` 背景色（Carbon Blue #0f62fe）
- CSS 强制 `.copied` 圆角为 0
- CSS 添加复制成功文字反馈

### 关联评审

- 架构评审：useCopied.tsx.md（CONDITIONAL APPROVE）
- 安全评审：useCopied.tsx.security.md（CONDITIONAL APPROVE，3.7 分）
- UI 评审：useCopied.tsx.ui.md（2.7 分）
