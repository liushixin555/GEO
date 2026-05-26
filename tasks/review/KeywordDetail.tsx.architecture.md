# pages/knowledge/KeywordDetail.tsx — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 组件职责分离 (SRP) | 3.5/10 | CRITICAL |
| 类型系统与实体层一致性 | 3.0/10 | CRITICAL |
| 表单架构 | 2.5/10 | CRITICAL |
| 数据流设计 | 4.0/10 | HIGH |
| 错误处理一致性 | 3.5/10 | HIGH |
| DESIGN.md 合规性 | 4.5/10 | HIGH |
| 可维护性与可测试性 | 4.0/10 | HIGH |
| **综合** | **3.5/10** | **REQUEST CHANGES** |

**结论：REQUEST CHANGES** — 存在 3 项 CRITICAL 架构缺陷、4 项 HIGH 级别问题，阻断合并。

---

## CRITICAL-1 — 表单校验系统被全面绕过，`form.validateFields()` 从未调用

**位置**：L78-99（handleExpand）、L105-146（handleSave）

整个组件声明了 `Form.Item rules={[{ required: true, message: '种子词不能为空' }]}`（L191），但三个操作函数全部使用 `form.getFieldValue()` 手动取值 + 手动判空，Antd Form 的声明式校验链从未触发：

| 函数 | 行号 | 取值方式 | 校验方式 |
|------|------|---------|---------|
| `handleExpand` | L79 | `form.getFieldValue('keyword')` | 手动 `!keyword?.trim()` |
| `handleSave`（isNew） | L114 | `form.getFieldValue('keyword')?.trim() \|\| ''` | 无校验，空字符串直接提交 |
| `handleSave`（edit） | L127 | `form.getFieldValue('keyword')` | 手动 `!keyword?.trim()` |

**影响链**：

1. **isNew 路径无校验**：L114 `seedWord` 可为空字符串，`POST /keywords/batch` 会将 `seed_word: ''` 发送到后端
2. **edit 路径手动校验绕过 rules**：`form.getFieldValue` 不触发 `rules` 校验，用户看不到 Form.Item 红色错误提示，只看到一个 `message.warning` toast
3. **validateFields 的 Promise 拒绝从未处理**：即使未来添加调用，当前架构也无 `.catch` 处理
4. **声明式与命令式校验共存**：Form.Item `rules` 声明式 vs `handleSave` 命令式，违反单一真相源原则

**项目先例**：`KnowledgeBaseForm.tsx` 正确使用 `form.validateFields()` 触发声明式校验。

**修复建议**：

```typescript
const handleSave = async () => {
  try {
    const values = await form.validateFields(); // 触发 rules 校验
    const keyword = values.keyword?.trim();
    // ... 后续逻辑
  } catch (validationError) {
    // form.validateFields 拒绝时自动显示红色错误
    return;
  }
};
```

---

## CRITICAL-2 — 类型系统与实体层完全断裂，本地重复定义 3 套平行接口

**位置**：L11-14（ExpandedWordItem）、L26（data state inline type）、L47（`(w: any)` 类型断言）

组件定义了 3 套本地类型，完全绕过 `apis/entity/knowledge.entity.ts` 中已有的类型定义：

| 本地定义 | 行号 | 实体层对应 | 差异 |
|---------|------|-----------|------|
| `ExpandedWordItem { word, selected }` | L11-14 | `KeywordExpandedWord` (L30-38) | 缺少 id, keyword_id, created_at, updated_at, deleted_at |
| `data` state inline type | L26 | `KnowledgeKeywordDetail` (L22-27) | 缺少 base_id, seed_word, group_id, created_at, updated_at, deleted_at, creator_name |
| `(w: any)` 映射断言 | L47 | `ExpandedWordInput` (L42-45) | `any` 绕过类型检查 |

**影响链**：

1. **字段缺失不可见**：`data` state 类型缺少 `deleted_at`，若后端返回已软删除的关键词，前端无法感知
2. **重构阻力**：实体层修改字段名或添加必填字段时，组件因使用本地类型而不会产生编译错误，导致运行时才发现不兼容
3. **`any` 类型穿透**：L47 的 `(w: any)` 允许后端返回任意结构不经校验直接进入 state，若后端字段名变更（如 `word` → `name`），不会产生任何编译警告

**修复建议**：

```typescript
import type { KnowledgeKeywordDetail, KeywordExpandedWord, ExpandedWordInput } from '../../apis/entity/knowledge.entity';

// 使用实体类型而非本地重复定义
const [data, setData] = useState<KnowledgeKeywordDetail | null>(null);

// expanded_words 映射使用实体类型
setExpandedWords(kwData.expanded_words.map((w: KeywordExpandedWord) => ({
  word: w.word, selected: w.selected
})));
```

---

## CRITICAL-3 — `Alert` 使用 `title` prop 而非 `message`，错误信息不可见

**位置**：L70、L189

Ant Design `Alert` 组件的内容通过 `message` prop 显示，`title` 不是合法 prop：

```tsx
// L70 — 无效，错误信息不显示
<Alert type="error" title="无效的知识库ID" showIcon ... />

// L189 — 同样无效
<Alert type="error" title={error} className="form-alert" showIcon closable ... />
```

**影响**：

1. **L70**：无效 baseId 时用户看不到错误提示，只看到一个空的 Alert 框 + 返回按钮
2. **L189**：所有 API 错误（如 L124 `setError(err.response?.data?.message || '保存失败')`）不会显示，用户操作失败无反馈

这是功能性缺陷——错误提示系统完全失效。

**修复建议**：将 `title` 替换为 `message`。

---

## HIGH-1 — 组件职责过重，249 行承担 6 种职责无任何抽取

**位置**：整个文件（L1-249）

该组件同时承担以下职责：

| 职责 | 行数 | 应抽取为 |
|------|------|---------|
| 路由参数解析 + 模式判断 | L17-24 | `useKeywordParams()` 自定义 hook |
| 数据获取（详情 + 知识库名称） | L38-64 | `useKeywordDetail()` 自定义 hook |
| AI 扩词业务逻辑 | L78-99 | `useKeywordExpand()` 自定义 hook |
| 展开词列表状态 + 分页 | L34-36, L101-103, L150 | `useExpandedWords()` 自定义 hook |
| 权限计算 | L76 | `useCanEdit()` 或 hook 返回值 |
| 保存逻辑（新建 + 编辑双分支） | L105-146 | `useKeywordSave()` 自定义 hook |

**对比**：同目录 `KnowledgeBaseForm.tsx` 将表单逻辑抽取为独立组件，职责更清晰。

**修复建议**：至少将数据获取和业务逻辑抽取为 3-4 个自定义 hook：

```
useKeywordDetail(baseId, id)     → { data, loading, fetchData }
useKeywordExpand(baseId, form)   → { expandedWords, expanding, handleExpand, toggleSelect }
useKeywordSave(baseId, id, isNew) → { saving, error, handleSave }
```

---

## HIGH-2 — 三种错误处理模式混用，无统一策略

**位置**：L49-51、L57-59、L96-98、L117-125、L131-145

| 模式 | 位置 | 用途 |
|------|------|------|
| `message.error(getApiErrorMessage(...))` | L50, L97 | fetchData / handleExpand 错误 |
| `/* ignore */` 空 catch | L59 | baseName 获取失败 |
| `setError(err.response?.data?.message \|\| '保存失败')` + Alert 显示 | L124, L143 | handleSave 错误 |

**问题**：

1. **模式 A vs 模式 C 不一致**：`fetchData` 用 `message.error()`（全局 toast），`handleSave` 用 `setError` + Alert（局部提示）。同一页面相同类型的错误（API 调用失败）用了两种不同的展示方式
2. **模式 B 吞错误**：L59 的空 catch 使得 baseName 获取失败完全静默，面包屑永远显示 `...`
3. **模式 C 使用 `err: any`**：L123/143 用 `err: any` 访问 `err.response?.data?.message`，绕过类型安全

**修复建议**：统一使用 `getApiErrorMessage` + `message.error` 或 `setError`，移除空 catch。

---

## HIGH-3 — 所有 API 调用无 AbortController，组件卸载后仍更新 state

**位置**：L38-52（fetchData）、L55-61（fetchBaseName）、L86-98（handleExpand）、L117-125/131-145（handleSave）

4 个异步函数均直接 `await` apiClient 调用，无任何取消机制：

```typescript
// L38-52 — fetchData
const fetchData = useCallback(async () => {
  // ... 无 signal 参数
  const res = await apiClient.get(`/knowledge-bases/${baseId}/keywords/${id}`);
  setData(kwData); // 组件已卸载时仍调用 setState → React 警告 + 潜在内存泄漏
}, [id, baseId, isNew]);
```

当用户快速导航（如点击面包屑返回列表页再进入其他关键词），旧的 API 响应可能在组件卸载后才到达，导致：

1. React "Can't perform a React state update on an unmounted component" 警告
2. 短暂的状态错乱（旧数据覆盖新数据）

**修复建议**：

```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, [fetchData]);
```

---

## HIGH-4 — `err: any` 三处使用绕过类型安全

**位置**：L47、L123、L143

```typescript
// L47 — 展开词映射
kwData.expanded_words.map((w: any) => ({ word: w.word, selected: w.selected }))

// L123 — handleSave isNew 路径
} catch (err: any) {
  setError(err.response?.data?.message || '保存失败');
}

// L143 — handleSave edit 路径
} catch (err: any) {
  setError(err.response?.data?.message || '保存失败');
}
```

**项目先例**：同文件 L49/96 已正确使用 `err: unknown` + `getApiErrorMessage`，与 L123/143 的 `err: any` 模式形成自相矛盾。

**修复建议**：L47 使用实体类型，L123/143 使用 `getApiErrorMessage`：

```typescript
kwData.expanded_words.map((w: KeywordExpandedWord) => ({ ... }))
// ...
} catch (err: unknown) {
  setError(getApiErrorMessage(err, '保存失败'));
}
```

---

## MEDIUM-1 — 大量内联样式违反 DESIGN.md 规范

**位置**：L185、L189、L190、L210-211、L219、L222

```typescript
style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}  // L185
style={{ margin: 0 }}                                                           // L187
style={{ width: 280 }}                                                          // L192
style={{ marginBottom: 16 }}                                                    // L201
style={{ marginTop: 12, textAlign: 'right' }}                                   // L211
```

DESIGN.md 定义了 IBM Carbon Design System 的 spacing token（$spacing-01 ~ $spacing-13），应使用 CSS 类引用而非内联魔术数字。

---

## MEDIUM-2 — 权限逻辑硬编码在组件内，无法复用

**位置**：L76

```typescript
const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);
```

同样的权限计算逻辑（角色 + 所有权）在 `KnowledgeBaseDetail.tsx`、`ArticleDetail.tsx` 等多个详情页重复出现，应提取为共享 hook 或 utility。

---

## MEDIUM-3 — `baseName` 获取无 loading/error 状态

**位置**：L33、L54-62

`baseName` 通过独立 useEffect 获取，但：

1. 无 loading 状态 → 初始渲染时面包屑显示 `...`，用户不知道是加载中还是获取失败
2. 空 catch → 获取失败时面包屑永远显示 `...`，无重试机制
3. 与 `data` loading 状态分离 → 两个 loading spinner 无法协调

---

## MEDIUM-4 — `EXPAND_PAGE_SIZE` 分页与 Table 内置分页能力重复

**位置**：L9、L150-219

手动实现了 `slice` 分页 + `Pagination` 组件，但 Antd `Table` 组件本身支持 `pagination` prop：

```typescript
// 当前实现：手动 slice + Pagination
const pagedWords = expandedWords.slice(...);  // L150
<Table ... dataSource={tableData} pagination={false} />  // L206-209
<Pagination ... />  // L212-219
```

可直接使用：

```tsx
<Table ... dataSource={expandedWords} pagination={{ pageSize: 10, showSizeChanger: false }} />
```

移除 `expandPage` state、`pagedWords` 计算、`Pagination` 组件，减少约 20 行代码。

---

## MEDIUM-5 — `fetchData` 的 useCallback 依赖数组缺少 `form`

**位置**：L38-52

```typescript
const fetchData = useCallback(async () => {
  // ...
  form.setFieldValue('keyword', kwData.keyword);  // L45 — 使用了 form
  // ...
}, [id, baseId, isNew]);  // form 未列入依赖
```

`form` 实例是 `Form.useForm()` 返回的稳定引用，当前不产生 bug，但违反 React hooks 规则，在未来 Antd 版本中可能变为不稳定引用。

---

## LOW-1 — `columns` 定义在每次渲染时重新创建

**位置**：L152-171

`columns` 数组在组件函数体内定义，每次渲染都会创建新数组，可提取为组件外常量或使用 `useMemo`。

---

## LOW-2 — `pageTitle` 计算可提取为独立变量或 hook 返回值

**位置**：L174

```typescript
const pageTitle = isNew ? '添加关键词' : (isEditMode ? '编辑关键词' : '关键词详情');
```

此计算与页面标题、面包屑、返回逻辑耦合，可作为 hook 的一部分返回。

---

## 正面评价

| 架构实践 | 评价 |
|----------|------|
| Breadcrumb 导航 | 良好 — 三级面包屑提供清晰的层级导航 |
| 编辑/新建双模式 | 合理 — 通过 route param `id=add` 区分，避免额外路由 |
| AI 扩词功能 | 创新 — expand + select + batch create 是完整的用户流程 |
| 展开词去重 | 良好 — L91-94 使用 Set 去重，避免重复添加 |
| 保存按钮计数提示 | 良好 — L229-230 显示已选数量，提升用户体验 |
| 权限守卫 | 基本正确 — `canEdit` 考虑了角色 + 所有权 + 编辑模式 |

---

## 修复优先级路线图

### 立即修复（P0 — 阻断合并）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| C-1: 表单校验绕过 | 数据完整性 | 小 |
| C-2: 类型与实体层断裂 | 重构阻力 + 运行时错误 | 中 |
| C-3: Alert title→message | 错误不可见 | 小 |

### 短期修复（P1 — 本迭代）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| H-1: 组件职责抽取 | 可维护性 | 中 |
| H-2: 错误处理统一 | 用户体验 | 小 |
| H-3: AbortController | 内存泄漏 | 小 |
| H-4: any 类型消除 | 类型安全 | 小 |

### 中期改进（P2 — 下一迭代）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| M-1: 内联样式→CSS 类 | DESIGN.md 合规 | 中 |
| M-2: 权限逻辑抽取 | 代码复用 | 小 |
| M-3: baseName loading | 用户体验 | 小 |
| M-4: Table 内置分页 | 代码精简 | 小 |

---

*软件架构专家评审完成 — 2026-05-26*
