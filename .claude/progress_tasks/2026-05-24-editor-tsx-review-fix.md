# Editor.tsx 评审修复

**日期**: 2026-05-24
**评审来源**: tasks/review/Editor.tsx.md / .security.md / .ui.md / .committer.md

## 修复项

### Committer 评审
1. **ESLint no-restricted-imports 规则** — 创建 `eslint.config.cjs`，禁止从 `@uiw/react-md-editor` 标准入口导入（含 rehype-raw XSS 风险）
2. **禁止标准入口注释** — MarkdownEditor.tsx 文件头添加醒目警告"⚠️ 禁止改为标准入口"
3. **pnpm 提升 ESLint 包** — 创建 `.npmrc` 配置 `public-hoist-pattern[]=@typescript-eslint/*`
4. **lint 命令更新** — `package.json` 中 `--ext .ts,.tsx` 移除（ESLint 9 flat config 不支持）

### UI 评审
5. **CSS-02 拖拽条增强** — 手柄从 24×2px 增大到 32×3px，更易发现和拖拽
6. **CSS-03 按钮 pressed 态** — 添加 `:active` 伪类 `background-color: var(--color-blue-80)`
7. **CSS-03 按钮最小触控目标** — min-width/min-height 32px + padding 4px 8px
8. **CSS-05 Firefox 滚动条** — 添加 `scrollbar-width: thin` + `scrollbar-color` 标准属性
9. **UX-02 模式切换过渡** — 编辑区添加 200ms cubic-bezier 过渡动画
10. **R-01 移动端响应式** — @media (max-width: 672px) 增大按钮触控至 40×40px

### 安全/架构评审（确认项）
11. **A-04 aria-live 补全** — MutationObserver 中为预览区添加 `aria-live="polite"` + `aria-label`

## 未修复项（第三方库层面，无法直接修改）
- 工厂层 10 处 useMemo 副作用（上游问题，封装层已隔离）
- 事件监听器泄漏（上游问题，MarkdownEditor 已通过 cloneNode 清理）
- ContextStore 索引签名（上游问题，封装层已通过类型接口限制）

## 文件变更
- `eslint.config.cjs` — 新增 ESLint 9 flat config
- `.npmrc` — 新增 pnpm 提升规则
- `package.json` — lint 命令更新
- `pages/components/MarkdownEditor.tsx` — 注释 + aria-live
- `pages/styles/markdown-editor.css` — 6 项 CSS 修复
- `.claude/progress.md` — 索引更新
