# 2026-05-24 Editor.common.tsx 评审修复

## 变更内容
- 根据 `tasks/review/Editor.common.tsx.*` 5份评审报告修复项目封装层

## 修复清单

### 安全修复
- **SEC-MD-04 (MEDIUM)**: useEffect cleanup 卸载时克隆替换 .w-md-editor-text DOM 节点释放事件监听器
- **SEC-MD-05 (MEDIUM)**: commandsFilter 移除 help 命令，消除 window.open Tabnabbing 风险

### 无障碍修复
- **A-01 (P1)**: 工具栏注入 role="toolbar" + aria-label，按钮匹配中文 aria-label
- **A-02 (P1)**: textareaProps 注入 aria-label="Markdown 编辑器"
- **A-03 (P2)**: CSS 添加 focus-visible 焦点样式（Carbon 签名式 2px IBM Blue outline）

### CSS 样式修复
- **CSS-01 (P2)**: 工具栏按钮 focus-visible
- **CSS-02 (P3)**: 拖拽条视觉样式 + hover 效果 + 中央指示条
- **CSS-03 (P3)**: 全屏模式背景色和工具栏样式
- **R-01 (P2)**: 工具栏 overflow-x: auto 移动端支持

## 涉及文件
- `pages/components/MarkdownEditor.tsx` — DOM清理 + commandsFilter + ARIA
- `pages/styles/markdown-editor.css` — focus-visible + 拖拽条 + 全屏 + overflow

## 验证
- TypeScript 类型检查通过
- 后端测试 7 套件 424 用例全部通过
