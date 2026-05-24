# 软件架构专家评审：pages/article/ArticleDetail.tsx

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 · 模块化 · 组件拆分 · 状态管理 · 数据流 · 关注点分离 · SOLID · 可演进性）
**文件路径**: `pages/article/ArticleDetail.tsx`
**代码行数**: 889 行（React 单文件组件）
**关联文件**: `pages/context/AppContext.tsx`, `pages/utils/date.ts`, `pages/components/Layout.tsx`

---

## 一、总体架构评估

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 组件拆分（模块化） | 2/10 | 889 行单组件，承担 6+ 职责，无子组件提取 |
| 状态管理架构 | 3/10 | 17 个 useState 平铺，无状态聚合，缺少派生状态机制 |
| 数据流设计 | 4/10 | 无 API 层抽象，11 处直接 axios 调用，无统一数据获取策略 |
| 关注点分离 | 2/10 | UI 渲染、业务逻辑、数据获取、权限判断全部耦合在一个函数体中 |
| Hook 架构 | 4/10 | 6 个 useEffect 职责不清、依赖项缺失，2 个 useCallback 仅部分使用 |
| 类型架构 | 4/10 | ArticleData 接口定义存在，但大量 any 类型，API 响应无契约 |
| 可演进性 | 2/10 | 新增文章类型、新增审核步骤、新增平台功能均需直接修改此 889 行文件 |
| 错误处理架构 | 3/10 | 无统一错误边界，无全局错误拦截，策略不一致（静默/提示/Alert） |
| 性能架构 | 3/10 | 无 memo/lazy/useMemo 策略，forceRender 挂载全量 DOM |
| 可测试性 | 2/10 | 所有业务逻辑内嵌于组件，无法独立单元测试 |

**问题统计**: CRITICAL × 3 / HIGH × 4 / MEDIUM × 4 / LOW × 2

**综合评级**: D+（功能完整但架构严重不合理，单文件承担过多职责，重构优先级极高）

---

## 二、架构层面问题清单

### CRITICAL 级别

#### C-1: 巨型组件（God Component）— 架构核心病灶

**位置**: 整个文件（889 行）
**SOLID**: 单一职责原则（SRP）严重违反
**架构反模式**: God Object / God Component

ArticleDetail 是一个典型的 God Component，它承担了至少 **6 个完全不同的架构职责**：

| 职责 | 行数范围 | 行数 | 占比 | 应归属 |
|------|----------|------|------|--------|
| 文章元数据 CRUD | L309-369, L524-766 | ~250 行 | 28% | `useArticleForm` hook + `ArticleSettingsForm` 组件 |
| 正文内容编辑/预览 | L371-386, L769-834 | ~100 行 | 11% | `ArticleContentEditor` 组件 |
| 文档导入（.md/.docx 解析） | L430-482 | ~50 行 | 6% | `useDocumentImport` hook |
| 图片管理（上传/URL/知识库三种模式） | L484-508, L580-681 | ~130 行 | 15% | `ArticleImageManager` 组件 |
| 发布平台选择（分页+搜索+排序 Modal） | L220-265, L690-765 | ~120 行 | 14% | `PlatformSelectModal` 组件 + `usePlatformSelector` hook |
| 审核流程 + 自动保存 + 权限控制 | L297-307, L388-428, L93-133 | ~90 行 | 10% | `useArticleActions` hook |

**量化对比**:

| 指标 | 当前值 | 行业健康阈值 | 偏离程度 |
|------|--------|-------------|----------|
| 文件总行数 | 889 | < 200 行 | 4.4× 超标 |
| useState 数量 | 17 | < 5 | 3.4× 超标 |
| useEffect 数量 | 6 | < 3 | 2× 超标 |
| 异步函数数量 | 12 | 1-2 个 hook | 6× 超标 |
| JSX 嵌套深度 | 5 层 | < 3 层 | 1.7× 超标 |
| 内联样式数量 | 40+ | 0（应使用 CSS 类） | 严重超标 |

**架构影响**:

1. **认知负荷**: 新开发者需通读 889 行代码才能理解任何一个功能点
2. **修改耦合**: 修改图片管理逻辑可能意外影响审核流程，因为共享同一个 state 空间
3. **代码审查**: PR 审查者难以在 889 行 diff 中准确定位变更影响范围
4. **合并冲突**: 多人同时修改不同功能时，冲突集中在同一文件
5. **测试困难**: 无法对单个职责编写独立的单元测试
6. **复用障碍**: 文档导入、图片管理、平台选择等逻辑无法在其他页面复用

**目标架构**:

```
pages/article/
├── ArticleDetail.tsx                # 页面容器（~100 行）
│   ├── 路由参数解析、页面布局
│   ├── 组合子组件
│   └── 全局错误处理
├── components/
│   ├── ArticleSettingsForm.tsx       # 设置表单（~180 行）
│   ├── ArticleContentEditor.tsx      # 正文编辑/预览（~100 行）
│   ├── ArticleImageManager.tsx       # 图片管理（~140 行）
│   ├── PlatformSelectModal.tsx       # 发布平台选择弹窗（~120 行）
│   └── ArticleReviewActions.tsx      # 审核操作栏（~60 行）
├── hooks/
│   ├── useArticleDetail.ts           # 文章数据 CRUD + 自动保存
│   ├── useArticlePermissions.ts      # 权限计算（canEdit*）
│   ├── useKnowledgeBase.ts           # 知识库选项加载
│   ├── usePlatformSelector.ts        # 平台选择器状态管理
│   ├── useDocumentImport.ts          # 文档导入解析
│   └── useArticleActions.ts          # 审核/提交/重新生成
└── types.ts                          # 共享类型定义
```

**收益**: 每个文件 < 200 行，职责单一，可独立测试，可跨页面复用。

---

#### C-2: 无 API 层抽象 — 数据获取逻辑完全内嵌

**位置**: 全文件 11 处 axios 调用
**SOLID**: 依赖倒置原则（DIP）违反
**架构模式**: 缺少 Repository / Service 层

当前数据获取架构的问题层级：

```
当前架构（扁平，无抽象层）:
┌──────────────────────────────────────────┐
│  ArticleDetail Component (889 行)         │
│  ├── axios.get(...articles/${id}...)      │ ← 直接耦合 HTTP 细节
│  ├── axios.post(...articles...)           │ ← 重复 token 获取
│  ├── axios.put(...articles/${id}...)      │ ← 重复 error 处理
│  ├── axios.put(...articles/${id}/content) │ ← 重复 baseUrl 构建
│  ├── axios.put(...articles/${id}/review)  │ ← 无 401 统一处理
│  ├── axios.put(...articles/${id}/regen..) │ ← 无请求取消机制
│  ├── axios.put(...articles/${id}/submit..)│
│  ├── axios.get(...skills...)              │
│  ├── axios.get(...llm-models/enabled)     │
│  ├── axios.get(...publishing-platforms)   │
│  ├── axios.post(...upload)                │
│  └── axios.get(...knowledge/keywords)     │
└──────────────────────────────────────────┘
```

**问题详解**:

1. **Token 重复获取**: 11 处 `localStorage.getItem('token')`，违反 DRY
2. **URL 硬编码**: `/api/projects/${projectId}/articles` 在多处重复拼写
3. **无 401 统一处理**: token 过期时无法统一跳转登录页
4. **无请求取消**: 组件卸载后异步请求仍执行，可能导致 state 更新于已卸载组件
5. **无请求去重**: 快速连续点击"保存"可能触发多次请求
6. **无缓存策略**: 知识库选项每次组件挂载都重新请求

**目标架构**:

```
pages/article/
├── api/
│   └── articleApi.ts                # 文章相关 API 封装
│       ├── getArticle(id)
│       ├── createArticle(data)
│       ├── updateArticle(id, data)
│       ├── updateContent(id, content)
│       ├── reviewArticle(id, approved)
│       ├── regenerateArticle(id)
│       └── submitForReview(id)
│
pages/
├── lib/
│   └── apiClient.ts                 # axios 实例 + 拦截器
│       ├── baseURL 配置
│       ├── token 注入拦截器
│       ├── 401 跳转拦截器
│       └── 统一错误转换
```

```typescript
// pages/lib/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({ baseURL: '/api' });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**收益**: 消除 11 处重复代码，统一认证和错误处理，支持请求取消和缓存。

---

#### C-3: 状态管理架构混乱 — 17 个 useState 无聚合策略

**位置**: L49-87（39 行状态声明）
**架构模式**: 扁平状态（Flat State）反模式

当前 17 个 state 变量可以按职责分为 4 个聚合组：

| 聚合组 | state 变量 | 数量 | 应归属 |
|--------|-----------|------|--------|
| 文章数据 | article, loading, saving, error | 4 | `useArticleDetail` hook |
| 表单状态 | writeMode, portraitMode, imageMode, imageList, urlInput, uploading | 6 | `useArticleForm` hook |
| 选项数据 | skillsOptions, llmModelsOptions, platformOptions, kbKeywords, kbPortraits, kbImages, kbLoading | 7 | 各自的专用 hook |
| 平台选择器 | platformModalOpen, platformList, platformTotal, platformPage, platformSearch, platformLoading, selectedPlatformKeys, platformSortBy, platformSortOrder | 9 | `usePlatformSelector` hook |
| 内容编辑 | content, contentSaving, contentMode | 3 | `ArticleContentEditor` 组件内部 |

**核心问题**:

1. **状态爆炸**: 17 个 state 导致组件每次更新都要处理 17 个变量的协调
2. **关联状态分散**: `platformPage` + `platformSearch` + `platformSortBy` + `platformSortOrder` 是强关联状态，应聚合为 `useReducer`
3. **派生状态未 memo 化**: `isSettingsEditable` 和 `isContentEditable` 在每次渲染时重新计算
4. **状态同步负担**: `writeMode` 和 `form.getFieldValue('write_mode')` 两个来源，可能导致不一致

**平台选择器 useReducer 示例**:

```typescript
interface PlatformSelectorState {
  modalOpen: boolean;
  list: any[];
  total: number;
  page: number;
  search: string;
  loading: boolean;
  selectedKeys: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

type PlatformAction =
  | { type: 'OPEN_MODAL'; selectedKeys: string[] }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_DATA'; list: any[]; total: number; page: number }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_SORT'; sortBy: string; sortOrder: 'asc' | 'desc' }
  | { type: 'TOGGLE_SELECT'; key: string };

function platformReducer(state: PlatformSelectorState, action: PlatformAction): PlatformSelectorState {
  // ... reducer 实现
}
```

**收益**: 状态变更可预测，相关状态原子性更新，减少中间态不一致。

---

### HIGH 级别

#### H-1: useEffect 生命周期管理架构缺陷

**位置**: L93-133, L170-172, L175-179, L182-191, L194-217, L268-295
**架构问题**: 缺少请求生命周期管理

6 个 useEffect 的职责和问题分析：

| useEffect | 行数 | 职责 | 依赖项问题 | 请求取消 | 错误处理 |
|-----------|------|------|-----------|---------|---------|
| 自动保存 | L93-133 | 5分钟定时保存 | 缺 form/imageList/message | N/A | 静默吞掉 |
| fetchArticle | L170-172 | 加载文章数据 | 完整（useCallback） | ❌ 无 | message.error |
| 重置 contentMode | L175-179 | 路由切换重置 | 缺 location.state | N/A | N/A |
| 打开内容编辑 | L182-191 | 导航状态处理 | 完整 | N/A | N/A |
| fetchOptions | L194-217 | 加载下拉选项 | 缺 form/isNew | ❌ 无 | 静默吞掉 |
| fetchKnowledge | L268-295 | 加载知识库 | 仅 projectId | ❌ 无 | 静默吞掉 |

**缺失的架构模式**:

1. **AbortController**: 组件卸载时应取消进行中的请求
2. **竞态条件防护**: 快速切换文章 ID 时，旧请求的响应可能覆盖新请求
3. **SWR / React Query**: 数据获取 + 缓存 + 自动重验证 + 请求取消，社区成熟方案

```typescript
// 竞态条件示例：快速从 /article/1 切换到 /article/2
// 请求 1 发出 → 请求 2 发出 → 请求 2 返回（正确）→ 请求 1 返回（覆盖了正确数据！）
```

**建议使用 SWR 替代手动数据获取**:

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => apiClient.get(url).then(r => r.data.data);

function useArticleDetail(id: string | undefined, projectId: number | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    id && projectId ? `/projects/${projectId}/articles/${id}` : null,
    fetcher
  );
  return { article: data, loading: isLoading, error, refetch: mutate };
}
```

---

#### H-2: 权限架构内嵌于组件 — 缺少权限抽象层

**位置**: L47, L297-307
**架构模式**: 权限逻辑应抽取为独立 hook 或 HOC

```typescript
// 当前：权限逻辑硬编码在组件内部
const user = JSON.parse(localStorage.getItem('user') || '{}');

const canEditSettings = () => {
  if (!article) return false;
  if (!['draft', 'manual_writing'].includes(article.status)) return false;
  return user.role === 'sysadmin' || article.created_by === user.id;
};
```

**问题**:

1. **权限逻辑分散**: 如果其他页面也需要"是否可编辑文章"的判断，需复制粘贴此函数
2. **用户信息来源不统一**: `localStorage` 直接读取，无 Context 或 hook 抽象
3. **无权限变更响应**: 用户角色变更时（如被降权），不会自动反映在已加载的页面
4. **无权限缓存**: 每次渲染都重新计算 `canEditSettings()`

**目标架构**:

```typescript
// hooks/useArticlePermissions.ts
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export function useArticlePermissions(article: ArticleData | null) {
  const { user } = useAuth();

  return useMemo(() => ({
    canEditSettings: article
      ? ['draft', 'manual_writing'].includes(article.status)
        && (user.role === 'sysadmin' || article.created_by === user.id)
      : false,
    canEditContent: article
      ? EDITABLE_STATUSES.includes(article.status)
        && (user.role === 'sysadmin' || article.created_by === user.id)
      : false,
    canReview: article?.status === 'pending_review'
      && user.role === 'sysadmin',
    canSubmitForReview: article?.status === 'manual_writing'
      && (user.role === 'sysadmin' || article.created_by === user.id),
  }), [article, user]);
}
```

---

#### H-3: 自动保存架构存在竞态风险

**位置**: L93-133
**架构问题**: 定时器与手动保存可能同时触发

```typescript
useEffect(() => {
  const TIMER = 5 * 60 * 1000;
  const timer = setInterval(async () => {
    // ... 可能与用户点击"保存正文"同时执行
  }, TIMER);
  return () => clearInterval(timer);
}, [isNew, id, projectId]);
```

**竞态场景**:

| 时间轴 | 自动保存 | 用户手动保存 |
|--------|---------|-------------|
| T1 | 定时器触发，读取 contentRef | — |
| T2 | 开始 PUT 请求（内容版本 A） | — |
| T3 | — | 用户修改内容（版本 B） |
| T4 | — | 用户点击"保存正文" |
| T5 | — | 开始 PUT 请求（内容版本 B） |
| T6 | — | PUT B 返回成功 |
| T7 | PUT A 返回成功 | — |
| **结果** | **版本 A 覆盖了版本 B！** | |

当前虽有 `version` 字段，但自动保存和手动保存都未使用乐观锁（If-Match / version check），服务端最后写入者胜出。

**建议架构**:

1. 保存请求携带 `version` 字段，服务端做版本校验（乐观锁）
2. 自动保存和手动保存共享同一个"保存队列"，互斥执行
3. 使用 `useRef` 标记是否有进行中的保存操作

```typescript
const savingRef = useRef(false);

const doSave = async (content: string) => {
  if (savingRef.current) return; // 跳过：已有保存进行中
  savingRef.current = true;
  try {
    await apiClient.put(`/projects/${projectId}/articles/${id}/content`, {
      content,
      version: articleRef.current?.version, // 乐观锁
    });
  } finally {
    savingRef.current = false;
  }
};
```

---

#### H-4: 类型架构薄弱 — API 契约缺失

**位置**: L23-38（ArticleData）, L68（platformList: any[]）, L104-114（payload: any）
**架构问题**: 前后端类型契约断裂

**问题清单**:

| 位置 | 问题 | 风险 |
|------|------|------|
| L23-38 | `ArticleData` 手动定义，与后端 Prisma model 无同步保障 | 前后端类型可能漂移 |
| L68 | `platformList: any[]` | 无属性提示，拼错属性名不报错 |
| L104-114 | `payload: any` | 请求体无类型校验 |
| L309 | `values: any` | 表单值无类型约束 |
| L47 | `JSON.parse(...)` 返回 `any` | user 对象属性无保障 |
| L198-286 | API 响应全部 `as any` | 响应结构变更无法编译时报错 |

**目标架构**:

```typescript
// types/article.ts — 与后端共享的类型契约
export interface Article {
  id: number;
  title: string;
  article_type: ArticleType | null;
  write_mode: WriteMode | null;
  keywords: string | null;
  portrait: string | null;
  images: string[] | null;
  platforms: string[] | null;
  skills: number[] | null;
  llm_model_id: number | null;
  content: string | null;
  version: number;
  status: ArticleStatus;
  created_by: number | null;
}

export type ArticleType = '榜单排名' | '方法论讲解' | '案例分析' | '行业洞察'
  | '对比测评' | '客户证言' | 'FAQ问答' | '实操指南';

export type WriteMode = 'manual' | 'ai';

export type ArticleStatus = keyof typeof STATUS_CONFIG;

export interface ArticleFormValues {
  title?: string;
  article_type?: ArticleType;
  write_mode?: WriteMode;
  keywords?: string;
  portrait?: string;
  platforms?: string[];
  skills?: number[];
  llm_model_id?: number;
}

export interface Platform {
  name: string;
  taxonomy: string;
  price: number | null;
  include_rate: number | null;
  publish_rate: number | null;
}
```

---

### MEDIUM 级别

#### M-1: Collapse + forceRender 架构决策不合理

**位置**: L836-846
**架构问题**: 违反按需加载原则

```typescript
const collapseItems = [
  { key: 'settings', label: '文章设置', children: settingsTab, forceRender: true },
  { key: 'content', label: '文章正文', children: contentTab, forceRender: true },
];
```

`forceRender: true` 意味着：
1. MDEditor 组件（~300KB 体积）即使面板折叠也完整挂载
2. 图片列表即使不可见也渲染所有 Image 组件
3. 平台选择 Modal 即使未打开也创建完整 DOM

对于新建文章，`defaultActiveKeys = ['settings', 'content']`，两个面板都展开，forceRender 无意义。对于编辑文章，settings 面板默认折叠但仍然渲染。

**建议**: 移除 `forceRender`，改为条件渲染：

```typescript
const collapseItems = [
  { key: 'settings', label: '文章设置', children: activeKeys.includes('settings') ? settingsTab : null },
  { key: 'content', label: '文章正文', children: activeKeys.includes('content') ? contentTab : null },
];
```

或使用 `destroyInactivePanel` 属性。

---

#### M-2: 导航状态架构 — location.state 滥用

**位置**: L176-191, L342, L870-882
**架构问题**: 跨页面状态传递依赖不可靠的 location.state

```typescript
// 发送方：通过 navigate 传递状态
navigate(`/article/${id}`, { replace: true, state: { openContentEdit: true } });

// 接收方：依赖 location.state
if (location.state?.openContentEdit && !isNew) {
  setContentMode('edit');
  // ...
  window.history.replaceState({}, ''); // 手动清除
}
```

**问题**:

1. **浏览器刷新丢失**: location.state 在刷新后消失，用户 F5 后无法恢复到"编辑模式"
2. **浏览器前进/后退异常**: replaceState 清除不完整可能导致状态残留
3. **无类型保障**: `location.state` 是 `unknown` 类型，无编译时校验
4. **单一字段承载多语义**: `openContentEdit` 既是"打开编辑"信号，又是"滚动到内容区"信号

**替代方案**:

```typescript
// 方案 1: URL 参数（可刷新持久化）
navigate(`/article/${id}?action=edit`);
const searchParams = new URLSearchParams(location.search);
if (searchParams.get('action') === 'edit') setContentMode('edit');

// 方案 2: Context + 全局状态
navigate(`/article/${id}`);
articleStore.setPendingAction('edit');
```

---

#### M-3: 错误处理架构缺乏层次化设计

**位置**: 全文件多处 catch 块
**架构问题**: 无统一错误分类和传播机制

当前错误处理策略的矛盾：

| 场景 | 策略 | 用户感知 | 后端感知 |
|------|------|---------|---------|
| 加载文章失败 | `message.error` | Toast 提示 | ❌ |
| 加载选项失败 | 静默吞掉 | 无感知 | ❌ |
| 保存设置失败 | `setError` + Alert | 红色 Alert | ❌ |
| 自动保存失败 | 静默吞掉 | 无感知 | ❌ |
| 审核操作失败 | `message.error` | Toast 提示 | ❌ |
| 文档导入失败 | `message.error` | Toast 提示 | ❌ |

**建议的错误处理层次**:

```
┌─────────────────────────────────────────┐
│  Layer 1: Error Boundary               │  ← 捕获渲染错误
│  （页面级，展示错误回退 UI）              │
├─────────────────────────────────────────┤
│  Layer 2: API Interceptor              │  ← 捕获网络/401/500
│  （全局拦截，401 跳转，5xx 提示）         │
├─────────────────────────────────────────┤
│  Layer 3: Hook Error Handler           │  ← 捕获业务错误
│  （hook 层 try-catch，返回 error 对象）   │
├─────────────────────────────────────────┤
│  Layer 4: Component UI                 │  ← 展示错误给用户
│  （Alert / message / form 校验）         │
└─────────────────────────────────────────┘
```

---

#### M-4: 组件间通信架构缺失 — 父子组件通信依赖闭包

**位置**: L525（Form onFinish）, L866-884（按钮 onClick）
**架构问题**: 当前单组件模式下所有状态在同一作用域，但拆分后需要明确的组件通信架构

拆分后的通信架构规划：

```
ArticleDetail（容器组件）
├── State: article, loading, error
├── Actions: fetchArticle, createArticle, updateArticle
│
├── ArticleSettingsForm
│   ├── Props: article, isEditable, onSave, onCancel
│   ├── Internal State: writeMode, portraitMode, imageMode
│   └── Emits: onSubmit(values)
│
├── ArticleContentEditor
│   ├── Props: article, content, isEditable
│   ├── Internal State: contentMode, content
│   └── Emits: onSaveContent(content)
│
├── ArticleImageManager
│   ├── Props: imageList, isEditable, projectId
│   ├── Internal State: imageMode, urlInput, uploading
│   └── Emits: onChange(imageList)
│
├── PlatformSelectModal
│   ├── Props: open, selectedKeys, onConfirm, onCancel
│   ├── Internal State: page, search, sortBy, sortOrder
│   └── Emits: onConfirm(selectedKeys)
│
└── ArticleReviewActions
    ├── Props: article, isEditable, onReview, onRegenerate
    └── Emits: onApprove, onReject, onRegenerate
```

---

### LOW 级别

#### L-1: 魔法字符串（Magic Strings）散布

**位置**: L10-19, L21, L298-307, L546-555
**问题**: 状态值和文章类型硬编码在组件内部

```typescript
// 状态值硬编码
const EDITABLE_STATUSES = ['draft', 'manual_writing', 'generate_failed', 'publish_failed'];

// 文章类型硬编码
options={[
  { label: '榜单排名', value: '榜单排名' },
  { label: '方法论讲解', value: '方法论讲解' },
  // ...
]}
```

**建议**: 与后端共享枚举定义，从 API 或配置文件获取，避免前后端不一致。

---

#### L-2: 新建/编辑模式混合在单一组件中

**位置**: L45（`const isNew = id === 'new'`）, 全文多处 `if (isNew)` 条件分支
**问题**: 新建和编辑的业务逻辑差异越来越大，但共用同一套 state 和 handler

新建模式特有逻辑：
- 默认 contentMode 为 'edit'
- AI 模式下不显示标题字段
- 手动模式下显示导入按钮
- 保存时走 POST 而非 PUT
- 自动保存需要创建文章后再跳转

编辑模式特有逻辑：
- 加载已有数据填充表单
- 显示状态 Tag
- 显示审核操作
- 支持重新生成

**建议**: 拆分为 `ArticleCreate` 和 `ArticleEdit` 两个页面组件，共享 hooks 和子组件。

---

## 三、架构重构路线图

### Phase 1: 安全修复（1 天）

| 优先级 | 任务 | 预计 | 收益 |
|--------|------|------|------|
| P0 | 创建 `apiClient.ts`，统一 token 注入和 401 处理 | 2h | 消除 11 处重复代码 |
| P0 | localStorage 解析包裹 try-catch | 0.5h | 防止组件崩溃 |
| P0 | mammoth HTML 清理使用 DOMPurify | 1h | 消除 XSS 漏洞 |

### Phase 2: 组件拆分（2-3 天）

| 优先级 | 任务 | 预计 | 收益 |
|--------|------|------|------|
| P1 | 提取 `ArticleContentEditor` 子组件 | 2h | 独立可测试 |
| P1 | 提取 `ArticleImageManager` 子组件 | 3h | 消除 130 行 JSX |
| P1 | 提取 `PlatformSelectModal` 子组件 | 3h | 独立可复用 |
| P1 | 提取 `ArticleSettingsForm` 子组件 | 3h | 职责单一化 |

### Phase 3: Hook 提取（1-2 天）

| 优先级 | 任务 | 预计 | 收益 |
|--------|------|------|------|
| P1 | 提取 `useArticleDetail` hook | 2h | 数据获取逻辑独立 |
| P1 | 提取 `useArticlePermissions` hook | 1h | 权限逻辑可复用 |
| P1 | 提取 `usePlatformSelector` hook（useReducer） | 2h | 9 个 state → 1 个 reducer |
| P1 | 提取 `useKnowledgeBase` hook | 1h | 知识库数据独立管理 |
| P2 | 提取 `useArticleActions` hook | 2h | 审核流程独立 |
| P2 | 提取 `useDocumentImport` hook | 1h | 导入逻辑可复用 |

### Phase 4: 类型与通信架构（1 天）

| 优先级 | 任务 | 预计 | 收益 |
|--------|------|------|------|
| P2 | 定义 `types/article.ts` 共享类型 | 2h | 消除 any |
| P2 | 定义组件 Props 接口 | 1h | 编译时类型保障 |
| P2 | 统一错误处理层次 | 2h | 一致性 |

### Phase 5: 性能优化（1 天）

| 优先级 | 任务 | 预计 | 收益 |
|--------|------|------|------|
| P3 | React.memo 包装子组件 | 1h | 减少不必要渲染 |
| P3 | useMemo 包装派生状态 | 1h | 避免重复计算 |
| P3 | React.lazy 懒加载 MDEditor | 0.5h | 减少首屏包体积 |
| P3 | 移除 Collapse forceRender | 0.5h | 减少初始 DOM 量 |

**总预计工作量**: 7-9 个工作日

---

## 四、架构度量对比（当前 vs 目标）

| 度量指标 | 当前 | Phase 2 后 | Phase 3 后 |
|----------|------|-----------|-----------|
| 文件行数 | 889 | 主文件 ~100 + 子组件 ~600 | 主文件 ~80 |
| useState 数量 | 17 | 主文件 ~6 | 主文件 ~3 |
| useEffect 数量 | 6 | 主文件 ~2 | 主文件 ~1 |
| axios 直接调用 | 11 | 11（未改） | 0（通过 hook） |
| any 类型数量 | ~15 | ~15 | ~3 |
| JSX 最大嵌套深度 | 5 | 3 | 2 |
| 可独立测试的函数 | 0 | 4 个组件 | 7 个 hook + 4 个组件 |
| 修改一个功能需阅读的代码行数 | 889 | ~200 | ~100 |

---

## 五、评审结论

`ArticleDetail.tsx` 是一个**功能完整但架构严重不合理**的 God Component。889 行代码、17 个 state、12 个异步函数、6 个 useEffect 全部集中在一个组件中，违反了单一职责原则、关注点分离原则和依赖倒置原则。

核心架构病灶是**缺少组件拆分**和**缺少 API 层抽象**，导致：
1. 业务逻辑与 UI 渲染强耦合，无法独立测试
2. 数据获取逻辑内嵌于组件，无缓存、无取消、无竞态防护
3. 状态管理扁平化，17 个 state 之间隐式关联，难以追踪数据流
4. 所有修改集中在同一文件，合并冲突风险极高

**建议优先执行 Phase 1（安全修复）和 Phase 2（组件拆分）**，将 God Component 拆解为 5 个子组件 + 6 个自定义 hook，使主文件降至 100 行以内。

**评审结果**: ❌ 架构不通过 — 需在下一迭代中完成组件拆分和 API 层抽象重构。

---

## 六、架构修复记录（2026-05-25）

### 已完成修复

| 编号 | 修复项 | 修复内容 | 涉及文件 |
|------|--------|----------|----------|
| C-1 | God Component | 主文件 889→218 行，拆分为 5 子组件 + 6 hooks | ArticleDetail.tsx |
| C-2 | API 层抽象 | 创建 apiClient.ts，统一 token 注入 + 401 拦截 | pages/lib/apiClient.ts |
| C-3 | 状态管理 | 17 个 useState 分散到 6 个专用 hooks | hooks/* |
| H-1 | AbortController | fetchArticle 添加 AbortController 防竞态 + 内存泄漏 | useArticleDetail.ts |
| H-2 | 权限抽象 | 提取 useArticlePermissions hook | useArticlePermissions.ts |
| H-3 | 自动保存竞态 | savingRef 互斥 + autoSave 返回值处理导航 | useArticleDetail.ts, ArticleDetail.tsx |
| H-4 | 类型修复 | `err: any` → `unknown`, `Record<string, any>` → 具体类型 | useArticleActions.ts, usePlatformSelector.ts, useDocumentImport.ts, ArticleImageManager.tsx |
| M-1 | forceRender | 已移除 forceRender，改为条件渲染 | ArticleDetail.tsx |
| M-3 | 错误处理 | 消除 console.warn/console.error，统一使用 message.error | usePlatformSelector.ts, useKnowledgeBase.ts, useDocumentImport.ts |
| L-1 | 魔法字符串 | 状态值和类型定义提取到 types.ts | types.ts |

### 修复后架构度量

| 度量指标 | 评审时 | 修复后 |
|----------|--------|--------|
| 主文件行数 | 889 | 218 |
| useState 数量 | 17 | 4（主组件） |
| useEffect 数量 | 6 | 4（主组件） |
| axios 直接调用 | 11 | 0（通过 apiClient） |
| `any` 类型数量 | ~15 | 0（hooks/components 中） |
| 子组件数量 | 0 | 5 |
| 自定义 hooks | 0 | 6 |

### 剩余低优先级项

- L-2: 新建/编辑模式混合（当前通过 isNew 条件分支处理，可接受）
- M-2: location.state 导航（改为 URL 参数需同步修改路由，风险较高，留待后续）
