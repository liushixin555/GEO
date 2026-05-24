# 软件质量专家评审：pages/article/ArticleDetail.tsx

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（ISO 25010 / Clean Code / SOLID / React Best Practices / 安全视角）
**评审范围**: 文章详情页组件 `pages/article/ArticleDetail.tsx`（889 行）
**关联文件**: `pages/context/AppContext.tsx`, `pages/utils/date.ts`, `pages/components/Layout.tsx`

---

## 1. 质量总体评级：C+（功能完整，但组件体量严重超标，职责耦合度高）

该组件实现了文章 CRUD、AI 生成、手工编写、审核流程、文档导入、图片管理等完整业务功能，但 **889 行代码全部集中在单一组件中**，违反单一职责原则（SRP）。组件内含 17 个 state 变量、12 个异步函数、嵌套 3 层以上的 JSX 条件渲染，可读性和可维护性显著下降。

| 质量维度 | 评分 | 状态 |
|----------|------|------|
| 功能完整性（Functional Completeness） | 9/10 | 覆盖了文章全生命周期（创建、编辑、AI生成、审核、发布） |
| 可维护性（Maintainability） | 3/10 | 889 行单组件，17 个 state，12 个异步函数，修改风险极高 |
| 可读性（Readability） | 4/10 | JSX 嵌套 3-4 层条件渲染，settingsTab 和 contentTab 占 470+ 行 |
| 安全性（Security） | 5/10 | XSS 风险（mammoth HTML 转换）、localStorage 解析无保护、缺少 CSRF 防护 |
| 性能（Performance） | 5/10 | 缺少 React.memo、useMemo、useCallback 优化，知识库 API 无缓存 |
| 可测试性（Testability） | 3/10 | 业务逻辑与 UI 强耦合，无法独立测试 handler 函数 |
| 设计规范遵循（Design Compliance） | 7/10 | 使用 antd 组件，但存在少量内联样式和 CSS 变量引用不一致 |

---

## 2. 优点识别

### 2.1 业务流程完整

组件覆盖了文章管理的完整生命周期：新建 → 草稿 → AI生成/手工编写 → 审核通过/拒绝 → 发布，状态机设计合理。`STATUS_CONFIG` 和 `EDITABLE_STATUSES` 常量定义清晰。

### 2.2 权限控制到位

```typescript
const canEditSettings = () => {
  if (!article) return false;
  if (!['draft', 'manual_writing'].includes(article.status)) return false;
  return user.role === 'sysadmin' || article.created_by === user.id;
};
```

角色（sysadmin/admin/view）+ 创建者双重检查，权限控制逻辑正确。

### 2.3 自动保存机制

自动保存使用 `contentRef` 和 `articleRef` 避免闭包陷阱，5 分钟定时器自动清理，设计合理。

### 2.4 文档导入功能

支持 `.md` 和 `.docx` 格式导入，自动提取标题并填充到表单，用户体验良好。

---

## 3. 质量问题清单

### Q-01: 组件体量严重超标 — 单一职责原则违反

**严重度**: 🔴 CRITICAL
**位置**: 整个文件（889 行）
**ISO 25010**: 可维护性 — 模块化性 / 可分析性
**Clean Code**: 单一职责原则（SRP）

组件承担了至少 6 种职责：
1. 文章元数据 CRUD（settings form）
2. 正文内容编辑/预览（content editor）
3. 文档导入（.md/.docx 解析）
4. 图片管理（上传/URL/知识库三种模式）
5. 发布平台选择（带分页、搜索、排序的 Modal）
6. 审核流程（通过/拒绝/提交审核/重新生成）

**建议拆分方案**:
```
ArticleDetail.tsx (主组件, ~150行)
├── hooks/useArticleDetail.ts     — 数据获取、保存逻辑
├── hooks/useKnowledgeBase.ts     — 知识库选项加载
├── hooks/usePlatformSelector.ts  — 发布平台选择逻辑
├── ArticleSettingsForm.tsx       — 设置表单 (~200行)
├── ArticleContentEditor.tsx      — 正文编辑/预览 (~120行)
├── ArticleImageManager.tsx       — 图片管理 (~150行)
├── PlatformSelectModal.tsx       — 发布平台 Modal (~120行)
└── ArticleReviewActions.tsx      — 审核操作按钮 (~60行)
```

### Q-02: XSS 安全风险 — mammoth HTML 转换后未充分清理

**严重度**: 🔴 CRITICAL
**位置**: `ArticleDetail.tsx:443-456`
**安全**: CWE-79 (Stored XSS)

```typescript
const result = await mammoth.convertToHtml({ arrayBuffer });
const html = result.value;
markdown = html
  .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
  .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
  .replace(/<[^>]+>/g, '')
  // ...
```

**问题**:
1. 正则 `/<[^>]+>/g` 无法处理嵌套标签和恶意属性（如 `<img src=x onerror=alert(1)>`）
2. HTML 实体解码不完整，仅处理了 4 种（`&nbsp;`, `&amp;`, `&lt;`, `&gt;`），遗漏 `&quot;`, `&#x27;` 等
3. `MDEditor.Markdown` 渲染 Markdown 时可能执行内嵌 HTML

**建议**: 使用 `DOMPurify` 或 `sanitize-html` 库进行 HTML 清理，不要依赖正则表达式。

### Q-03: localStorage 解析无容错保护

**严重度**: 🟠 HIGH
**位置**: `ArticleDetail.tsx:47`
**安全**: 异常处理 / 数据完整性

```typescript
const user = JSON.parse(localStorage.getItem('user') || '{}');
```

**问题**:
1. `localStorage.getItem('user')` 可能返回非法 JSON 字符串（被篡改、损坏），`JSON.parse` 会抛出异常导致整个组件崩溃
2. 解析后的对象未做类型校验，后续 `user.role` 和 `user.id` 的访问可能为 `undefined`
3. 此代码在组件顶层执行，无法被 Error Boundary 优雅处理

**建议**:
```typescript
const [user, setUser] = useState({ role: '', id: null });
useEffect(() => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.role && parsed.id) setUser(parsed);
    }
  } catch { /* ignore corrupted data */ }
}, []);
```

### Q-04: Token 重复获取模式 — 11 处 `localStorage.getItem('token')`

**严重度**: 🟠 HIGH
**位置**: 全文件 11 处 axios 调用
**ISO 25010**: 可维护性 — 模块化性 / DRY

每个异步函数都重复执行：
```typescript
const token = localStorage.getItem('token');
await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
```

**问题**:
1. 11 处重复代码，违反 DRY 原则
2. token 过期时无统一处理（401 跳转登录）
3. 请求失败时缺乏统一错误拦截

**建议**: 使用 axios 实例 + 请求拦截器统一处理 token 注入和 401 跳转：
```typescript
const apiClient = axios.create({ baseURL: '/api' });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) navigate('/login');
  return Promise.reject(error);
});
```

### Q-05: useEffect 依赖项缺失或不完整

**严重度**: 🟠 HIGH
**位置**: `ArticleDetail.tsx:93-133`, `ArticleDetail.tsx:194-217`
**React**: exhaustive-deps 规则

```typescript
// 自动保存 useEffect — 缺少 form, imageList, message 依赖
useEffect(() => {
  const timer = setInterval(async () => {
    // 使用了 form.getFieldsValue(), imageList, message
  }, TIMER);
  return () => clearInterval(timer);
}, [isNew, id, projectId]); // ❌ 依赖不完整
```

```typescript
// fetchOptions useEffect — 缺少 form 依赖
useEffect(() => {
  const fetchOptions = async () => {
    // 使用了 form.setFieldValue
  };
  fetchOptions();
}, []); // ❌ form 和 isNew 未列入依赖
```

**风险**: 闭包中的 `form`、`imageList` 等可能引用过时值。虽然 `contentRef` 和 `articleRef` 部分缓解了 content 的闭包问题，但 form 和 imageList 仍存在陈旧闭包风险。

### Q-06: 知识库 API 请求无缓存/去重

**严重度**: 🟡 MEDIUM
**位置**: `ArticleDetail.tsx:268-295`
**ISO 25010**: 性能效率 — 资源利用率

每次 `projectId` 变化都会重新请求知识库数据（keywords/portraits/images 三个 API），但：
1. 页面切换时组件卸载/重载，已获取的数据丢失
2. `pageSize: 999` 一次性拉取全部数据，对大数据量不友好
3. 无 loading 状态对用户可见（`kbLoading` 仅用于 Select 组件，不阻塞页面交互）

### Q-07: 条件渲染嵌套过深，JSX 可读性差

**严重度**: 🟡 MEDIUM
**位置**: `ArticleDetail.tsx:580-681`（插图部分）
**Clean Code**: 扁平化 / 嵌套控制

插图部分的 JSX 条件渲染嵌套达 4 层：
```
isSettingsEditable ? (非编辑模式) : (
  imageMode === 'kb' ? (...) :
  imageMode === 'upload' ? (...) :
  imageMode === 'url' ? (...)
)
```

102 行的插图 JSX 应提取为独立组件 `ArticleImageManager`。

### Q-08: 错误处理不一致

**严重度**: 🟡 MEDIUM
**位置**: 全文件多个 catch 块
**ISO 25010**: 可靠性 — 错误处理一致性

错误处理策略不统一：
- `fetchArticle` (L163): `message.error(...)` — 用户可见通知
- `fetchOptions` (L212): 静默失败 `catch {}`
- `fetchPlatformList` (L241): 静默失败并重置状态
- `handleSaveSettings` (L364): 设置 `error` state + 显示 Alert
- 自动保存 (L128): 静默失败
- 文档导入 (L479): `message.error(...)`

建议统一错误处理策略：网络错误统一 toast，业务错误用 form 校验或 Alert。

### Q-09: 表单校验规则分散

**严重度**: 🟡 MEDIUM
**位置**: `ArticleDetail.tsx:870-882`
**ISO 25010**: 功能适用性 — 准确性

```typescript
form.validateFields()
  .then((values) => handleSaveSettings(values, false, writeMode === 'manual'))
  .catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
```

同一验证逻辑在 3 个按钮的 onClick 中重复（L870, L875, L880），应提取为共用函数：
```typescript
const submitForm = (onValid: (values: any) => void) => {
  form.validateFields()
    .then(onValid)
    .catch((info) => { if (info.errorFields?.length) message.error(info.errorFields[0].errors[0]); });
};
```

### Q-10: 类型安全不足

**严重度**: 🟡 MEDIUM
**位置**: 全文件
**TypeScript**: 严格类型检查

1. `handleSaveSettings(values: any, ...)` — `values` 应定义接口类型
2. `const user = JSON.parse(...)` — 解析结果为 `any`
3. `platformList: any[]` — 应定义 Platform 接口
4. `.map((s: any) => ...)` — 多处 API 响应使用 `any` 类型
5. `ArticleData` 接口定义了 `images: string[] | null`，但 API 返回可能不一致

### Q-11: CSS 变量引用不规范

**严重度**: 🟢 LOW
**位置**: 多处内联样式
**设计规范**: DESIGN.md 合规性

```typescript
color: 'var(--text-secondary)'   // L508, L584, L609, L695
color: 'var(--color-ink-muted)'  // L773
color: 'var(--color-ink-subtle)' // L828
background: 'rgba(0,0,0,0.25)'  // L639
```

问题：
1. `--text-secondary` 和 `--color-ink-muted` / `--color-ink-subtle` 混用，可能指向不同的 CSS 变量
2. `rgba(0,0,0,0.25)` 硬编码颜色，不符合 DESIGN.md 的语义化颜色规范
3. DESIGN.md 定义 `ink-muted: "#525252"`, `ink-subtle: "#8c8c8c"`，应统一使用 `var(--ink-muted)` 等

### Q-12: 缺少 loading 和空状态的用户反馈

**严重度**: 🟢 LOW
**位置**: `ArticleDetail.tsx:516-518`
**UX**: 加载状态反馈

```typescript
if (loading) {
  return <div className="page-container"><Spin /></div>;
}
```

全屏 Spin 无文字提示，用户无法区分"加载中"和"页面卡死"。建议添加 `Spin tip="加载文章中..."` 或骨架屏。

### Q-13: Collapse 组件 forceRender 可能影响性能

**严重度**: 🟢 LOW
**位置**: `ArticleDetail.tsx:837-846`

```typescript
const collapseItems = [
  { key: 'settings', label: '文章设置', children: settingsTab, forceRender: true },
  { key: 'content', label: '文章正文', children: contentTab, forceRender: true },
];
```

`forceRender: true` 导致所有面板（包括未展开的）在首次渲染时就执行完整的 DOM 挂载，对于包含大量表单项和 MDEditor 的面板会造成不必要的性能开销。

### Q-14: 未使用 formatDate/formatDateTime 工具

**严重度**: 🟢 LOW
**位置**: `pages/utils/date.ts` 未被引用
**CLAUDE.md**: 铁律 — 时间必须格式化为中国时区

虽然当前文件没有直接显示时间字段，但如果 `article` 数据中包含 `created_at` / `updated_at` 等时间字段，在后续需求中展示时应确保使用 `formatDate` / `formatDateTime`。

---

## 4. 安全问题汇总

| 编号 | 严重度 | 问题 | 位置 | 建议 |
|------|--------|------|------|------|
| SEC-01 | 🔴 CRITICAL | mammoth HTML 转换后 XSS 风险 | L443-456 | 使用 DOMPurify 清理 HTML |
| SEC-02 | 🟠 HIGH | localStorage 解析无 try-catch | L47 | 包裹 try-catch 并验证数据结构 |
| SEC-03 | 🟡 MEDIUM | Token 明文存储在 localStorage | 全文件 | 评估使用 HttpOnly Cookie 或内存存储 |
| SEC-04 | 🟡 MEDIUM | 缺少 CSRF 防护 | 全部 POST/PUT | 配置 CSRF Token 或 SameSite Cookie |
| SEC-05 | 🟢 LOW | URL 输入未校验合法性 | L502-508 | 使用 URL 构造函数验证 URL 格式 |

---

## 5. 性能优化建议

| 编号 | 优先级 | 当前问题 | 建议 |
|------|--------|----------|------|
| PERF-01 | HIGH | 组件整体 re-render 频繁 | 拆分子组件并使用 React.memo |
| PERF-02 | HIGH | `imageList` 每次 `setImageList` 创建新数组 | 使用 `useCallback` 包裹 handler |
| PERF-03 | MEDIUM | 知识库 API 每次挂载都请求 | 考虑 Context 级缓存或 SWR |
| PERF-04 | MEDIUM | MDEditor 组件较重 | 使用 `React.lazy` 懒加载 |
| PERF-05 | LOW | `Collapse forceRender` 导致不必要的 DOM | 移除 `forceRender`，改为按需渲染 |

---

## 6. 重构优先级路线图

| 优先级 | 任务 | 预计工作量 | 收益 |
|--------|------|------------|------|
| P0 | 修复 SEC-01: mammoth XSS 风险 | 1h | 消除关键安全漏洞 |
| P0 | 修复 SEC-02: localStorage 解析容错 | 0.5h | 防止组件崩溃 |
| P1 | 拆分组件为 6-7 个子组件 | 4h | 可维护性从 3/10 提升至 7/10 |
| P1 | 抽取 axios 实例 + 拦截器 | 2h | 消除 11 处重复 token 代码 |
| P1 | 提取自定义 hooks | 3h | 可测试性从 3/10 提升至 6/10 |
| P2 | 统一错误处理策略 | 1h | 一致性和用户体验提升 |
| P2 | 完善类型定义（消除 any） | 2h | TypeScript 类型安全性提升 |
| P3 | 性能优化（memo/lazy/缓存） | 2h | 大表单渲染性能提升 |

---

## 7. 评审结论

**ArticleDetail.tsx** 是一个功能完整的文章管理页面，业务逻辑覆盖全面，权限控制设计合理。但作为 **889 行的单文件组件**，它严重违反了单一职责原则，维护成本极高。组件的安全基础存在关键缺陷（XSS 风险、localStorage 解析无保护），需要立即修复。建议按照上述路线图进行重构，优先解决安全问题，然后拆分组件并提取自定义 hooks。

**评审结果**: ⚠️ 有条件通过 — 需在下一迭代中解决 P0 安全问题和 P1 组件拆分问题。
