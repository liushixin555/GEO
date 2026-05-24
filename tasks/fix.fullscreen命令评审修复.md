# fix. fullscreen 命令评审修复

> 状态：✅ 已完成

---

## 背景

基于 3 份专家评审报告（UI、安全、Committer），对第三方库 `@uiw/react-md-editor` 的 `fullscreen.tsx` 命令进行综合评审。结论：fullscreen.tsx 属于第三方依赖不可直接修改，必须通过项目封装层 `commandsFilter` 覆盖修复。

### 评审评分汇总

| 评审 | 评分/评级 | 核心结论 |
|------|----------|---------|
| UI 评审 | 3.4/10 CONDITIONAL APPROVE | 按钮点击不触发全屏、快捷键冲突、图标不规范 |
| 安全评审 | 8.5/10 APPROVE | 无安全漏洞，仅 boolean 状态切换 |
| Committer 审核 | 5.5/10 CONDITIONAL APPROVE | 按钮点击失效为 CRITICAL 级 Bug，需封装层覆盖 |

### 核心问题清单

| 编号 | 级别 | 问题 | 修复方式 |
|------|------|------|---------|
| U1 | CRITICAL | execute 函数按钮点击不触发全屏（shortcuts 条件守卫错误） | 移除 shortcuts 条件 |
| U3 | HIGH | ctrlcmd+0 与浏览器"重置缩放"冲突 | 重映射为 ctrlcmd+shift+f |
| U4 | HIGH | 12x12 图标不符合 Carbon/antd 规范 | 替换为 antd FullscreenOutlined |
| U5 | MEDIUM | ARIA 标注英文+空格不一致 | 覆盖为中文标注 |
| U7 | MEDIUM | focus() 无条件执行位置不当 | 移到条件判断之后 |

## 修复内容

### 修改文件

- `pages/components/MarkdownEditor.tsx` — 在 `commandsFilter` 中添加 fullscreen 命令覆盖

### 修复方案

在 `commandsFilter` 回调中拦截 `fullscreen` 命令，返回覆盖后的命令对象：

1. **快捷键重映射**: `ctrlcmd+0` → `ctrlcmd+shift+f`
2. **中文 ARIA 标注**: `aria-label: '切换全屏模式'`，`title: '切换全屏模式 (Ctrl+Shift+F)'`
3. **antd 图标**: 替换为 `FullscreenOutlined`（fontSize: 16）
4. **execute 修复**: 移除 `shortcuts` 条件判断，使按钮点击和快捷键统一行为；`focus()` 移到 dispatch 之后

### 测试

- 新增测试文件：`tests/pages/components/MarkdownEditor.test.tsx`
- 12 个测试用例，覆盖：渲染、快捷键覆盖、中文标注、图标替换、按钮点击触发全屏、快捷键触发全屏、dispatch 守卫、状态切换

## 验收标准

- [x] 工具栏按钮点击能触发全屏切换（U1 修复）
- [x] 快捷键不与浏览器 Ctrl+0 冲突（U3 修复）
- [x] 图标使用 antd FullscreenOutlined（U4 修复）
- [x] ARIA 标注为中文（U5 修复）
- [x] focus() 仅在 dispatch 成功后执行（U7 修复）
- [x] TypeScript 编译通过
- [x] ESLint 通过
- [x] 全部 12 个新测试通过
- [x] 已有 ArticleDetail 测试无回归（13 passed）
