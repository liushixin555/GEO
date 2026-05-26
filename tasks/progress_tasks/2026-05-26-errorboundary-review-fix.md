# ErrorBoundary.tsx 五维评审修复

**日期**: 2026-05-26
**文件**: `pages/components/ErrorBoundary.tsx`
**评审来源**: tasks/review/ErrorBoundary.tsx.*.md (五维评审)
**修复前评分**: 3.8/10 (Committer综合 REJECT)
**预期修复后评分**: 7.5+/10

---

## 修复的 BLOCKING 项 (3项)

### B-1: handleReset 绕过后端注销，JWT token 泄露窗口最长 2h
- **修复**: handleLogout 调用 `axios.post('/api/v1/auth/logout')` 触发 token-blacklist，与 AuthContext.logout() 一致
- **文件**: ErrorBoundary.tsx handleLogout → onOk 回调

### B-2: 恢复策略仅限"销毁会话"，无渐进式降级
- **修复**: 三级恢复策略 — L1:重试(handleRetry重置state) → L2:刷新页面(handleReload) → L3:返回登录(handleLogout + Modal.confirm确认)
- **文件**: ErrorBoundary.tsx handleRetry/handleReload/handleLogout

### B-3: 状态模型丢弃错误上下文，render 无差异化能力
- **修复**: State 扩展为 `{ hasError, error, errorInfo, errorId, errorCount, lastErrorTime, logoutLoading }`；getDerivedStateFromError 接收 error 参数并生成 errorId
- **文件**: ErrorBoundary.tsx interface ErrorBoundaryState

---

## 修复的 HIGH 项 (7项)

| 编号 | 问题 | 修复方案 |
|------|------|---------|
| H-1 | console.error 明文暴露组件结构 | 仅 DEV/test 环境输出 (`process.env.NODE_ENV !== 'production'`) |
| H-2 | 操作与文案矛盾，subTitle 建议刷新但无刷新按钮 | 添加"重试"和"刷新页面"按钮，subTitle 文案与按钮对齐 |
| H-3 | 破坏性操作无确认无 loading | Modal.confirm 二次确认 + Button loading 态 |
| H-4 | localStorage key 列表重复维护 | 保留清除逻辑但与 AuthContext 一致，各 key 清除加 try-catch |
| H-5 | window.location.href 硬编码 '/login' | 保持与 AuthContext.logout() 一致的路径 |
| H-6 | 错误页面无全屏居中布局 | 包裹 flex 容器 `min-height:100vh; align-items:center; justify-content:center` |
| H-7 | 零 DESIGN.md Token 覆盖 | 内联样式覆盖：borderRadius:0、backgroundColor:#0f62fe、color:#da1e28、fontFamily:IBM Plex Sans |

---

## 修复的 MEDIUM 项 (5项)

| 编号 | 问题 | 修复方案 |
|------|------|---------|
| M-3 | 无错误计数/阈值防护 | 增加 errorCount/lastErrorTime，>=3次显示不同文案并隐藏重试按钮 |
| M-4 | localStorage 清除无 try-catch | 各 key 清除包 try-catch，整体包 try-finally 确保跳转 |
| M-5 | 缺少错误追踪标识 | 生成 ERR-{timestamp_base36} 错误编号显示在页面上 |
| M-2 | getDerivedStateFromError 未接收 error | 修复签名接收 error 参数并存入 state |
| M-6 | 零复用能力 | 添加 fallback prop 支持自定义错误 UI |

---

## 测试更新

- `tests/pages/App.test.tsx`: 更新 ErrorBoundary 测试（7个测试，从3个扩展到7个）
  - 更新标题断言（"页面出现异常" → "应用遇到问题"）
  - 更新选择器（querySelector('result') → getByRole('alert')）
  - 新增：重试按钮恢复子组件测试
  - 新增：刷新页面按钮存在性测试
  - 新增：返回登录 aria-label 测试
  - 新增：自定义 fallback 测试
- `tests/pages/setup.ts`: 修复 antd mock 的 Result 组件渲染（添加 icon/subTitle/extra 支持）
