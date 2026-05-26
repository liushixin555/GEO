# ArticleDetail.tsx 安全专家评审

**文件**: `pages/article/ArticleDetail.tsx`（233 行）
**评审维度**: 代码安全（XSS / 注入 / 数据泄露 / 认证绕过 / 竞态 / CSRF）
**评审日期**: 2026-05-26
**评审结果**: **5.5/10 CONDITIONAL APPROVE**

---

## 评分明细

| 维度 | 分数 | 说明 |
|------|------|------|
| XSS 防护 | 7.0 | 内容通过 MarkdownViewer 渲染、DOMPurify 清洗；但 error/message 路径未经 sanitize |
| 注入防护 | 6.0 | URL 路径参数无校验；JSON.parse 无 try-catch |
| 认证/授权 | 7.5 | JWT header 鉴权 + useArticlePermissions RBAC；但 auto-save 绕过权限检查 |
| 数据保护 | 5.0 | auto-save 静默创建文章；imageList 无 URL 校验；beforeunload 脏检测不可靠 |
| 错误处理 | 4.5 | 空 catch 吞异常；getApiErrorMessage 可能泄露后端内部信息 |
| 竞态安全 | 5.0 | auto-save interval 依赖 unstable callback 引用导致频繁重建；savingRef 防重入仅覆盖 saveContent |

---

## BLOCKING（必须修复，3 项）

### B1. auto-save 静默创建新文章——用户无感知的数据持久化 [CRITICAL]

**位置**: `ArticleDetail.tsx:61-69` → `useArticleDetail.ts:128-161`

**问题**: 每 5 分钟定时器触发 `detail.autoSave(imageList)`。当 `isNew=true` 时，auto-save 执行 `POST /projects/${projectId}/articles` **创建一篇新文章**。用户未点击"保存"/"提交"，数据已被持久化到服务器。

**风险**:
1. **数据泄露**: 用户在新建页面填写敏感信息（标题、关键词、画像）后离开，5 分钟后数据自动上传
2. **垃圾数据**: 用户随意填写的半成品被创建为正式记录
3. **CSRF 放大器**: 恶意页面可通过 postMessage/setInterval 预填表单，auto-save 自动外泄
4. **重复创建**: interval 依赖 `detail.autoSave`（unstable 引用），高频重渲染时 interval 反复重建，若 timer 到期可连续创建多篇文章

**修复建议**:
```typescript
// 方案 A：新文章不自动创建，仅自动保存已有文章的正文
const autoSave = async (imageList: string[]) => {
  if (isNew) return; // 新文章不做 auto-save
  // ... 保存已有文章正文
};

// 方案 B（如确需）：auto-save 前必须经过表单校验
const autoSave = async (imageList: string[]) => {
  if (isNew) {
    try { await form.validateFields(); } catch { return; } // 校验不通过不保存
  }
  // ...
};
```

### B2. `JSON.parse(data.portrait)` 无 try-catch——恶意/损坏数据可崩溃前端 [HIGH]

**位置**: `useArticleDetail.ts:48`

```typescript
portrait: data.portrait ? JSON.parse(data.portrait) : undefined,
```

**问题**: `data.portrait` 来自 API 响应。若数据库中被注入畸形 JSON（如 `{"<script>alert(1)</script>}`），`JSON.parse` 抛出异常，导致 `fetchArticle` 整体失败，页面白屏。攻击者只需修改一条记录即可对特定用户实施 DoS。

**修复建议**:
```typescript
let parsedPortrait: string[] | undefined;
try { parsedPortrait = data.portrait ? JSON.parse(data.portrait) : undefined; }
catch { parsedPortrait = undefined; }
form.setFieldsValue({
  // ...
  portrait: Array.isArray(parsedPortrait) ? parsedPortrait : undefined,
});
```

### B3. auto-save interval 依赖 unstable 引用——timer 频繁重建导致保护失效 [HIGH]

**位置**: `ArticleDetail.tsx:61-69`

```typescript
useEffect(() => {
  const timer = setInterval(async () => {
    const result = await detail.autoSave(imageList);
    // ...
  }, 5 * 60 * 1000);
  return () => clearInterval(timer);
}, [isNew, id, projectId, imageList, detail.autoSave, navigate]);
```

**问题**: `detail.autoSave` 是 `useArticleDetail` 内的普通 async 函数（非 `useCallback`），每次渲染生成新引用。这导致：
1. 每次 `detail` 状态变化 → effect 重建 → interval 重置 → 5 分钟倒计时从头开始
2. 在频繁重渲染场景下，5 分钟保护形同虚设——实际上几乎不会触发 auto-save
3. 但如果 `imageList` 变化恰好在 timer 到期时，可能连续触发两次 auto-save（旧 timer 未清理完 + 新 timer 立即执行）

**修复建议**:
```typescript
// useArticleDetail.ts: 将 autoSave 包裹在 useCallback 中
const autoSave = useCallback(async (imageList: string[]) => {
  // ...
}, [projectId, id, isNew, form, message]); // 稳定依赖

// 或 ArticleDetail.tsx: 用 ref 固定 interval callback
const autoSaveRef = useRef(detail.autoSave);
autoSaveRef.current = detail.autoSave;
useEffect(() => {
  const timer = setInterval(() => autoSaveRef.current(imageList), 5 * 60 * 1000);
  return () => clearInterval(timer);
}, [isNew, id, projectId, imageList]); // 移除 detail.autoSave 依赖
```

---

## HIGH（强烈建议修复，5 项）

### H1. imageList 无 URL 校验——恶意 URL 可注入 XSS

**位置**: `ArticleDetail.tsx:26,42-44` → `useArticleDetail.ts:83,144`

**问题**: `imageList` 是 `string[]`，来源为 `detail.article.images`（API 响应）或用户操作。在保存时直接传入 payload：
```typescript
images: imageList.length ? imageList : undefined,
```
如果攻击者能修改 API 响应或拦截请求，注入 `javascript:alert(1)` 或 `data:text/html,<script>...</script>` URL，且下游渲染使用 `<img src={url}>`，可能触发 XSS。

**修复建议**:
```typescript
const SAFE_IMAGE_RE = /^https?:\/\//i;
const safeImages = imageList.filter(url => SAFE_IMAGE_RE.test(url));
```

### H2. URL 路径参数 `id` 无格式校验

**位置**: `ArticleDetail.tsx:17` → `useArticleDetail.ts:37`, `useArticleActions.ts:18,29,40`

**问题**: `id` 来自 `useParams`（URL 路径），直接拼接进 API URL：
```typescript
apiClient.get(`/projects/${projectId}/articles/${id}`)
```
若路由配置未限制 `id` 格式，攻击者可构造 `id=../..%2Fother-resource` 进行路径遍历。虽然 `apiClient` 会 encode URL，但最好在入口处校验。

**修复建议**:
```typescript
// 在 ArticleDetail 组件入口校验
if (id !== 'new' && id !== undefined && !/^\d+$/.test(id)) {
  return <Navigate to="/article" replace />;
}
```

### H3. 空 catch 块吞掉所有异常

**位置**: `ArticleDetail.tsx:118-120`

```typescript
} catch {
  // Error already set in hook
}
```

**问题**: 注释声称"hook 已处理错误"，但 `handleSave` 调用 `detail.saveSettings` 时，`saveSettings` 在 catch 中 `throw err` 重新抛出。这意味着：
1. `saveSettings` 内部 `setError(msg)` 设置了错误信息 → ✅
2. 然后 `throw err` 重新抛出 → `handleSave` 的 catch 捕获
3. 但 `handleSave` 的 catch 是空的，**错误信息只出现在 form 区域**，成功路径的 `message.success` 不会执行 → ✅ 但丢失了错误日志

**修复建议**: 至少添加 `console.error` 便于排查，或移除空 catch 让 React ErrorBoundary 捕获：
```typescript
} catch (err) {
  console.error('[ArticleDetail] save failed:', err);
}
```

### H4. `navigate()` 使用 API 返回的 ID——潜在的 Open Redirect

**位置**: `ArticleDetail.tsx:96,99,101,151`

```typescript
const articleId = result.data.id;
navigate(`/article/${articleId}`, { replace: true });
```

**问题**: `articleId` 来自 API 响应。若 API 被中间人篡改（如无 HTTPS），返回 `id=../../admin`，React Router 会导航到 `/article/../../admin`（规范化为 `/admin`）。

**修复建议**:
```typescript
const articleId = result.data.id;
if (!articleId || !/^\d+$/.test(String(articleId))) {
  message.error('创建响应异常');
  return;
}
navigate(`/article/${articleId}`, { replace: true });
```

### H5. auto-save 新文章跳过表单完整校验

**位置**: `useArticleDetail.ts:134-151`

**问题**: auto-save 仅检查 `keywords` 和 `llm_model_id` 是否存在，不校验 `title` 等必填字段。后端若不严格校验，可能创建无标题文章。

**修复建议**: auto-save 前调用 `form.validateFields()`，校验失败不保存。

---

## MEDIUM（建议修复，4 项）

### M1. `beforeunload` 脏检测不可靠

**位置**: `ArticleDetail.tsx:51-59`

```typescript
const contentChanged = detail.content !== (originalContentRef.current || '');
const formChanged = form.isFieldsTouched();
if (contentChanged || formChanged) e.preventDefault();
```

**问题**:
- `form.isFieldsTouched()` 检测字段是否被"触碰过"，不是检测值是否变化。用户改了再改回去仍触发 beforeunload（假阳性）
- `detail.content` 是独立 state，手动编辑正文后 `contentChanged=true`，但如果通过 `setContent('')` 清空（如导入空文档），则 `contentChanged=false`（假阴性）

**风险**: 用户可能误以为已保存而关闭页面导致数据丢失，或被频繁的"确认离开"弹窗烦扰而习惯性点"离开"。

### M2. `getApiErrorMessage` 可能泄露后端内部信息

**位置**: `useArticleDetail.ts:56,103,121`, `useArticleActions.ts:22,33,44`

**问题**: 所有错误消息通过 `getApiErrorMessage(err, fallback)` 处理。若该函数直接返回 `err.response.data.message`（含 SQL 错误、堆栈信息等），则用户可见后端内部状态。

**修复建议**: 确保 `getApiErrorMessage` 在生产环境只返回通用错误提示，不暴露原始错误。

### M3. `document.getElementById` + `scrollIntoView` DOM 操作

**位置**: `ArticleDetail.tsx:79,111`

```typescript
document.getElementById('article-content-section')?.scrollIntoView({ behavior: 'smooth' });
```

**问题**: 直接操作 DOM 绕过 React 虚拟 DOM，虽然当前 ID 是硬编码的（低风险），但如果 ID 被动态化或被外部脚本覆盖，可能导致意外行为。

### M4. `window.history.replaceState` 清除路由状态

**位置**: `ArticleDetail.tsx:81`

**问题**: `replaceState({}, '')` 清除 location.state 中的 `openContentEdit` 标记。虽然这是标准用法，但在某些浏览器中可能与 History API 的安全策略冲突。

---

## LOW（记录在案，1 项）

### L1. 定时器依赖 `detail.autoSave` 导致行为不可预测

auto-save 定时器在每次重渲染时重建（因 `detail.autoSave` 引用不稳定），5 分钟保护可能失效或过于频繁。已在 B3 中详述。

---

## 正面安全实践（值得肯定）

| 实践 | 位置 |
|------|------|
| JWT 放 Authorization header 而非 cookie（天然防 CSRF） | `apiClient` |
| AbortController 取消 inflight 请求 | `useArticleDetail.ts:32-34` |
| savingRef 防止 saveContent 并发重入 | `useArticleDetail.ts:113-114` |
| useArticlePermissions 基于 role + ownership 的 RBAC | `useArticlePermissions.ts` |
| 文档导入使用 DOMPurify 清洗 HTML | `useDocumentImport.ts:37-40` |
| 文档导入限制文件大小（10MB）+ 扩展名白名单 | `useDocumentImport.ts:9,24-56` |
| 删除操作有 Popconfirm 二次确认 | `ArticleDetail.tsx:216-218` |
| ArticleReviewActions 的 loading + disabled 防重复提交 | `ArticleReviewActions.tsx` |

---

## 修复优先级总结

| 优先级 | 编号 | 概述 | 工作量 |
|--------|------|------|--------|
| P0 | B1 | auto-save 静默创建新文章 → 加 isNew 守卫或表单校验 | 0.5h |
| P0 | B2 | JSON.parse 无 try-catch → 包裹异常处理 | 10min |
| P0 | B3 | auto-save interval unstable 引用 → useCallback 或 ref 固定 | 0.5h |
| P1 | H1 | imageList URL 校验 → 过滤非 http(s) URL | 15min |
| P1 | H2 | id 路径参数格式校验 → 正则 /^\d+$/ | 10min |
| P1 | H3 | 空 catch 块 → 添加 console.error | 5min |
| P1 | H4 | navigate ID 校验 → 数字格式验证 | 10min |
| P1 | H5 | auto-save 跳过校验 → validateFields | 15min |
| P2 | M1-M4 | 脏检测/错误脱敏/DOM操作/history | 1h |

**总预估修复工作量**: ~3h
