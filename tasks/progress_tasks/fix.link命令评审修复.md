# fix. link 命令评审修复

> 状态：✅ 已完成

---

## 背景

基于 5 份专家评审报告（质量 6.4/10、安全 6.8/10、UI 2.5/10、架构 5.5/10、Committer 6.0/10），对第三方库 `@uiw/react-md-editor` 的 `link.tsx` 命令进行综合评审。结论：link.tsx 属于第三方依赖不可直接修改，必须通过项目封装层 `commandsFilter` 覆盖修复。

### 评审评分汇总

| 评审 | 评分/评级 | 核心结论 |
|------|----------|---------|
| 质量评审 | 6.4/10 APPROVE WITH COMMENTS | data-name复制粘贴Bug + URL检测粗放 + 非空断言 |
| 安全评审 | 6.8/10 APPROVE WITH COMMENTS | javascript: URL穿透渲染层 + 非空断言 + 过期状态 |
| UI 评审 | 2.5/10 CONDITIONAL APPROVE | Ctrl+L快捷键冲突+空链接文本WCAG违规+12px图标+无antd集成 |
| 架构评审 | 5.5/10 APPROVE WITH COMMENTS | URL检测职责越界 + 双重配置源 + 与image.tsx 85%重复 |
| Committer 审核 | 6.0/10 CONDITIONAL APPROVE | 渲染链XSS风险最高+空链接文本+快捷键冲突，需封装层覆盖 |

### 核心问题清单

| 编号 | 级别 | 问题 | 修复方式 |
|------|------|------|---------|
| UI-P1-01 | P1 | Ctrl+L与浏览器地址栏冲突+非行业标准 | 重映射为 ctrlcmd+k |
| QUAL-H1/UI-P1-02 | P1 | SVG data-name="italic" 复制粘贴错误 | 替换为 antd LinkOutlined 图标 |
| UI-P1-03 | P1 | URL分支空链接文本[](url) WCAG 2.4.4 违规 | 从URL提取域名作默认链接文本 |
| SEC-S1 | P1 | javascript: URL穿透渲染层XSS | URL方案白名单过滤 |
| UI-P1-04 | P1 | 图标12px低于Carbon标准16px | antd图标16px |
| UI-P2-04 | P2 | SVG缺aria-hidden | antd图标自带 |
| QUAL-M2/SEC-S5 | P2 | URL检测includes('http')误判/漏判 | 正则检测 |
| SEC-S2/QUAL-M1 | P2 | prefix!非空断言崩溃风险 | 重写execute无prefix依赖 |

## 修复内容

### 1. link 命令覆盖（MarkdownEditor.tsx commandsFilter）

在 commandsFilter 中添加 `command.name === 'link'` 分支，完全覆盖默认 link 命令：

- **快捷键**: `ctrlcmd+l` → `ctrlcmd+k`（行业标准，消除浏览器冲突）
- **图标**: 12×12 填充 SVG → antd `LinkOutlined` 16px（Carbon 对齐 + aria-hidden）
- **ARIA**: 英文 → 中文（"插入链接 (Ctrl+K)"）
- **execute 重写**: 消除 prefix! 非空断言、let 重赋值、硬编码魔法字符串
- **URL 检测**: `includes('http')` → 正则 `/^(https?:\/\/|ftp:\/\/|ftps:\/\/|\/\/|www\.)[^\s]+$/i`
- **URL 方案白名单**: 拦截 javascript:/data:/vbscript: 等危险方案
- **域名提取**: URL 分支从 URL 提取 hostname 作为默认链接文本
- **错误边界**: try-catch 包裹整个 execute

### 2. Ctrl+L 浏览器拦截

在 `preventBrowserShortcut` 中添加 `key === 'l'` 拦截，防止浏览器选中地址栏。

## 涉及文件

- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 link 命令覆盖 + Ctrl+L 拦截

## 验收标准

- [x] link 命令快捷键改为 Ctrl+K
- [x] URL 分支不再生成空链接文本，自动提取域名
- [x] javascript:/data: URL 方案被拦截
- [x] URL 检测使用正则而非 includes
- [x] 无 prefix! 非空断言
- [x] 中文 ARIA 标注
- [x] antd 图标 16px
- [x] try-catch 错误边界
- [x] Ctrl+L 浏览器拦截
- [x] TypeScript 编译通过
- [x] ESLint 通过
- [x] MarkdownEditor.test.tsx 通过
