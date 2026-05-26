# pages/knowledge/KeywordDetail.tsx — 代码安全评审报告

**文件**: `pages/knowledge/KeywordDetail.tsx` (249行)
**评审类型**: 安全评审（Security Review）
**评审日期**: 2026-05-26
**评审人**: Claude (代码安全专家)

---

## 综合评分: 4.6 / 10

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证与授权 | 5/10 | 后端有 JWT + roleMiddleware + checkBaseAccess 三层保护，但前端 canEdit 完全信任 localStorage 可篡改数据 |
| 输入验证 | 4/10 | handleSave 绕过 Form.validateFields 直接读取字段值，Form 规则形同虚设；前端无长度/XSS 清理 |
| 错误处理与信息泄露 | 3/10 | 三套错误处理模式不一致；空 catch 吞掉安全事件；`err.response?.data?.message` 可泄露后端内部信息 |
| 数据安全 | 4/10 | Token 存 localStorage 受 XSS 威胁；expanded_words 批量提交无上限校验 |
| 竞态与并发安全 | 5/10 | handleSave 无幂等保护；智能扩词无防抖可被滥用 |
| 传输安全 | 6/10 | apiClient 自动注入 Bearer token，401 自动清理跳转，但无 AbortController 处理导航竞态 |

---

## 安全亮点（值得肯定）

1. **后端三重授权防线完整** — `knowledge.routes.ts:27` 的 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 拦截 view 角色；`checkBaseAccess` 验证知识库归属；`checkOwnership` 校验 created_by — 即使前端被绕过，后端仍能阻止未授权操作。
2. **后端 Zod schema 严格验证** — `expandKeywordsSchema` 限制 keyword 长度 1-200；`batchCreateKeywordsSchema` 限制数组最大 500 项；`sanitizeForLlm` 清理 LLM 输入防 Prompt Injection。
3. **getSafeUser() 防御性解析** — 角色 white-list 校验（`VALID_ROLES.includes`），无效角色降级为 `view`，NaN id 降级为 0。
4. **apiClient 401 自动清理** — token + user 双清理 + 强制跳转 `/login`，防止过期 token 滞留。
5. **无 dangerouslySetInnerHTML** — 全部使用 React JSX 渲染，自动 HTML 转义，无 XSS 注入面。

---

## 问题清单

### CRITICAL — 必须修复

#### SEC-C1: handleSave 完全绕过 Form 校验，空值/超长字符串直接提交到后端

- **位置**: `KeywordDetail.tsx:114`, `KeywordDetail.tsx:127`
- **代码**:
  ```typescript
  // 新建模式 — 绕过校验
  const seedWord = form.getFieldValue('keyword')?.trim() || '';

  // 编辑模式 — 绕过校验
  const keyword = form.getFieldValue('keyword');
  if (!keyword?.trim()) { message.warning('请输入关键词'); return; }
  ```
- **威胁模型**: `Form.Item` 第191行定义了 `rules={[{ required: true, message: '种子词不能为空' }]}`，但 `handleSave` 使用 `form.getFieldValue()` 直接读取值，**从未调用 `form.validateFields()`**。Form 的 `required` 规则完全无效 — 仅在用户通过 antd 内置提交（如 Enter 键）时才触发，而按钮的 `onClick={handleSave}` 完全跳过了校验链。
- **影响**:
  1. **空值提交**: 用户清空输入框后点击"保存"，仅触发 `message.warning`（编辑模式）或直接放行（新建模式 `seedWord = ''`），绕过了 required 校验
  2. **超长字符串**: 前端无 max-length 校验，200+ 字符的 payload 直达后端 — 虽然后端 Zod schema 有 `.max(200)` 保护，但前端未做防御浪费了带宽
  3. **特殊字符注入**: 无 XSS 清理，特殊字符直接发送到后端 — 后端 `.trim()` 只去空白
- **证据链**:
  - 前端: `KeywordDetail.tsx:114` — `form.getFieldValue('keyword')?.trim() || ''`
  - 前端: `KeywordDetail.tsx:191` — `rules={[{ required: true }]}` 形同虚设
  - 后端: `knowledge.schema.ts:3-6` — Zod `.max(200)` 是唯一防线
- **修复方案**:
  ```typescript
  const handleSave = async () => {
    if (!baseId) return;
    try {
      const values = await form.validateFields(); // 触发 Form 规则
      const keyword = values.keyword?.trim();
      // ... 继续保存逻辑
    } catch (validationErr) {
      // form.validateFields 失败时 antd 自动高亮错误字段
      return;
    }
  };
  ```

#### SEC-C2: Alert 组件使用 `title` prop 而非 `message`，安全错误信息完全不可见

- **位置**: `KeywordDetail.tsx:70`, `KeywordDetail.tsx:189`
- **代码**:
  ```typescript
  // 第70行 — 无效 baseId 错误（永远不可见）
  <Alert type="error" title="无效的知识库ID" showIcon ... />

  // 第189行 — 保存失败错误（不可见）
  <Alert type="error" title={error} ... />
  ```
- **威胁**: Ant Design `<Alert>` 组件的显示文本 prop 是 `message`，而非 `title`。`title` prop 在 Alert 上不存在（它是 Typography.Title 的 prop）。这意味着：
  1. **无效 baseId 永远不显示错误** — 用户看到空白的 Alert 区域，无法理解为何页面不可用
  2. **保存失败错误不可见** — 后端返回的 `err.response?.data?.message`（包括可能的 403 权限错误）虽然写入了 `error` state，但 Alert 无法渲染
  3. **攻击者可利用静默失败** — 未授权操作时用户看不到任何提示，无法感知安全事件
- **修复方案**:
  ```typescript
  // 第70行
  <Alert type="error" message="无效的知识库ID" showIcon ... />
  // 第189行
  <Alert type="error" message={error} ... />
  ```

---

### HIGH — 强烈建议修复

#### SEC-H1: 三套错误处理模式不一致，`err.response?.data?.message` 可泄露后端内部信息

- **位置**: `KeywordDetail.tsx:50`, `KeywordDetail.tsx:124`, `KeywordDetail.tsx:143`
- **代码**:
  ```typescript
  // 模式1 — getApiErrorMessage 辅助函数（安全）
  message.error(getApiErrorMessage(err, '加载失败'));                    // :50

  // 模式2 — 直接读取 response.data.message（不安全）
  setError(err.response?.data?.message || '保存失败');                   // :124, :143

  // 模式3 — 空 catch（最危险）
  catch { /* ignore */ }                                                 // :59
  ```
- **风险**: `getApiErrorMessage()` 在 500 错误时用 fallback 文本替换真实错误（`error.ts:4-6`），保护了内部信息。但 `handleSave` 中的两种错误路径直接使用 `err.response?.data?.message`，未经过此过滤。如果后端在 500 错误时返回包含堆栈跟踪、SQL 语句、文件路径的 message，这些信息将直接展示在 `error` state → Alert 中（虽然 Alert 当前不显示，但修复 C2 后将可见）。
- **影响范围**:
  1. `handleSave` 新建模式（`:123-124`）— 批量创建失败
  2. `handleSave` 编辑模式（`:142-143`）— 更新失败
- **修复方案**: 统一使用 `getApiErrorMessage`:
  ```typescript
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, '保存失败'));
  }
  ```

#### SEC-H2: `catch { /* ignore */ }` 空捕获块吞掉知识库名称获取的所有错误

- **位置**: `KeywordDetail.tsx:59`
- **代码**:
  ```typescript
  const fetchBaseName = async () => {
    try {
      const res = await apiClient.get(`/knowledge-bases/${baseId}`);
      setBaseName(res.data.data.name);
    } catch { /* ignore */ }
  };
  ```
- **风险**:
  1. **401/403 被吞掉** — 如果 token 过期或用户无权访问该知识库，`apiClient` 的 401 拦截器会清理 token 并跳转，但 `fetchBaseName` 的错误被静默忽略，不会触发任何用户反馈
  2. **安全事件不可追踪** — 任何网络错误、服务端异常都被静默吞掉，无法在控制台追踪
  3. **导航欺骗** — 如果 baseId 不存在但请求不报错（如后端返回 null），面包屑显示 `...`（baseName 默认值），用户无法区分"加载中"和"加载失败"
- **修复方案**:
  ```typescript
  } catch (err) {
    console.error('[KeywordDetail] fetchBaseName failed:', err);
  }
  ```

#### SEC-H3: 前端 `canEdit` 完全信任 localStorage 中的角色数据

- **位置**: `KeywordDetail.tsx:76`
- **代码**:
  ```typescript
  const canEdit = isEditMode && (user.role === 'sysadmin' || isNew || data?.created_by === user.id);
  ```
- **风险**: `user.role` 来源于 `getSafeUser()` → `localStorage.getItem('user')` → JSON.parse。攻击者可通过浏览器 DevTools 修改 `localStorage.user.role` 为 `'sysadmin'`，使 `canEdit=true`，从而：
  1. 看到编辑 UI（Input 可编辑、保存按钮可用）
  2. 提交编辑请求（apiClient 会附带真实 JWT token）
- **缓解因素**: 后端有完整的三重防线 — `roleMiddleware` + `checkBaseAccess` + `checkOwnership` — 即使前端放行，后端仍返回 403。
- **实际风险**: 低（后端防护完整），但违反纵深防御原则。编辑 UI 可见本身可能泄露字段结构信息。
- **修复建议**: 接受当前风险（后端已校验），但在代码注释中标注"前端校验仅为 UX 优化，授权以后端为准"。

#### SEC-H4: `catch (err: any)` 使用 any 类型，禁用 TypeScript 类型安全

- **位置**: `KeywordDetail.tsx:123`, `KeywordDetail.tsx:142`
- **代码**:
  ```typescript
  } catch (err: any) {
    setError(err.response?.data?.message || '保存失败');
  ```
- **风险**: `any` 类型绕过了 TypeScript 的类型检查，允许任意属性访问而不报错。如果 `err` 不是 AxiosError（如网络断开、Promise rejection），`err.response` 可能为 undefined 而非预期结构，导致运行时 TypeError。
- **修复方案**: 使用 `unknown` + 辅助函数:
  ```typescript
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, '保存失败'));
  }
  ```

---

### MEDIUM — 建议修复

#### SEC-M1: 智能扩词无客户端防抖，可被滥用触发 LLM API 高成本调用

- **位置**: `KeywordDetail.tsx:78-99` — `handleExpand`
- **代码**:
  ```typescript
  const handleExpand = async () => {
    // ... 无防抖
    setExpanding(true);
    const res = await apiClient.post(`/knowledge-bases/${baseId}/keywords/expand`, ...);
  };
  ```
- **风险**: 用户可快速连续点击"智能扩词"按钮，每次触发后端 `expandKeywords` → `llmService.expandKeywords()`，直接调用外部 LLM API。
  - **成本**: 每次调用产生 LLM token 费用，快速点击10次 = 10次 LLM 调用
  - **DoS**: 虽然有 `expanding` loading 状态，但组件未使用 AbortController，快速导航后请求仍继续
- **缓解因素**: 后端有 `rateMiddleware` 限制，但 LLM 调用的 rate limit 通常较宽松（60次/分钟级别）。
- **修复建议**: 添加 2 秒冷却期或使用 `lodash.debounce`:
  ```typescript
  const handleExpand = useCallback(
    debounce(async () => { ... }, 2000, { leading: true, trailing: false }),
    [baseId, expandedWords]
  );
  ```

#### SEC-M2: expanded_words 批量提交无前端上限校验

- **位置**: `KeywordDetail.tsx:109-120` — 新建模式 handleSave
- **代码**:
  ```typescript
  const selectedWords = expandedWords.filter(w => w.selected).map(w => w.word);
  // 无 selectedWords.length 上限检查
  const res = await apiClient.post(`/knowledge-bases/${baseId}/keywords/batch`,
    { keywords: selectedWords, seed_word: seedWord },
  );
  ```
- **风险**: 用户可多次点击"智能扩词"累积大量关键词，然后全选提交。后端 `batchCreateKeywordsSchema` 限制数组最大 500 项，但前端未校验：
  1. **网络带宽浪费**: 超过 500 的请求到达后端才被拒绝
  2. **用户体验差**: 大量选择后提交失败，无前端预警
- **修复方案**:
  ```typescript
  const MAX_BATCH = 500;
  if (selectedWords.length > MAX_BATCH) {
    message.warning(`单次最多创建 ${MAX_BATCH} 个关键词，请减少选择`);
    return;
  }
  ```

#### SEC-M3: 无 AbortController，快速导航导致请求竞态

- **位置**: `KeywordDetail.tsx:38-51` — fetchData, `KeywordDetail.tsx:55-61` — fetchBaseName, `KeywordDetail.tsx:78-99` — handleExpand
- **风险**: 组件 unmount 后（如用户快速点击返回），正在进行的 API 请求仍会执行回调，可能导致：
  1. **State update on unmounted component**: React 18 虽不报 warning，但仍是内存泄漏
  2. **数据竞争**: 新页面的请求响应被旧页面的回调覆盖
- **修复方案**: 使用 `useRef<AbortController>` + useEffect cleanup:
  ```typescript
  useEffect(() => {
    const controller = new AbortController();
    apiClient.get(url, { signal: controller.signal });
    return () => controller.abort();
  }, [...]);
  ```

#### SEC-M4: `isEditMode` 来自 URL searchParams，客户端可篡改绕过编辑限制

- **位置**: `KeywordDetail.tsx:23`
- **代码**:
  ```typescript
  const isEditMode = isNew || searchParams.get('mode') === 'edit';
  ```
- **风险**: 任何用户可在 URL 末尾添加 `?mode=edit` 将只读详情页变为编辑模式。虽然 `canEdit` 限制了实际编辑权限（需 sysadmin 或 created_by 匹配），但 `isEditMode` 还影响了 `pageTitle`（:174）等 UI 展示，可能造成用户困惑。
- **缓解因素**: `canEdit` 在 :76 行做了二次校验，`isEditMode` 单独不构成安全绕过。
- **实际风险**: 低 — 编辑 UI 可见但不可操作（Input disabled、Button disabled）。

---

### LOW — 可选修复

#### SEC-L1: 第47行 `(w: any)` 类型断言，禁用类型安全

- **位置**: `KeywordDetail.tsx:47`
- **代码**:
  ```typescript
  setExpandedWords(kwData.expanded_words.map((w: any) => ({ word: w.word, selected: w.selected })));
  ```
- **风险**: `any` 类型允许访问任意属性而不报错，如果后端返回的字段名变化（如 `word` → `text`），TypeScript 无法在编译期捕获。
- **修复方案**: 定义接口或使用已有实体类型:
  ```typescript
  kwData.expanded_words.map((w: { word: string; selected: boolean }) => ({ ... }))
  ```

#### SEC-L2: `form.setFieldValue` 在 fetchData 中设置初始值，可被 race condition 覆盖

- **位置**: `KeywordDetail.tsx:45`
- **风险**: 如果 `fetchData` 和用户输入几乎同时发生（如页面加载后用户立即开始输入），`form.setFieldValue` 可能覆盖用户的输入。
- **修复建议**: 在 `setFieldValue` 前检查表单是否已有用户输入。

---

## 修复优先级矩阵

| 编号 | 严重度 | 修复难度 | 优先级 | 说明 |
|------|--------|----------|--------|------|
| SEC-C1 | CRITICAL | 低 | P0 | `form.validateFields()` 替换 `getFieldValue` |
| SEC-C2 | CRITICAL | 低 | P0 | `title` → `message` prop 修复 |
| SEC-H1 | HIGH | 低 | P1 | 统一使用 `getApiErrorMessage` |
| SEC-H2 | HIGH | 低 | P1 | 添加 `console.error` |
| SEC-H3 | HIGH | 无 | P2 | 接受风险，添加注释说明 |
| SEC-H4 | HIGH | 低 | P1 | `any` → `unknown` + `getApiErrorMessage` |
| SEC-M1 | MEDIUM | 中 | P2 | 添加防抖或冷却期 |
| SEC-M2 | MEDIUM | 低 | P2 | 前端添加 500 上限校验 |
| SEC-M3 | MEDIUM | 中 | P3 | AbortController |
| SEC-M4 | MEDIUM | 无 | P3 | 接受风险 |
| SEC-L1 | LOW | 低 | P4 | 消除 `any` 类型 |
| SEC-L2 | LOW | 低 | P4 | 竞态保护 |

---

## 后端安全防线验证

| API 端点 | 认证 | 角色校验 | 知识库归属 | 所有权 | Zod 校验 | 评估 |
|----------|------|----------|-----------|--------|----------|------|
| `GET /keywords/:id` | JWT | sysadmin/admin | checkBaseAccess | - | parseId | 安全 |
| `POST /keywords/batch` | JWT | sysadmin/admin | checkBaseAccess | - | batchCreateKeywordsSchema (max 500) | 安全 |
| `POST /keywords/expand` | JWT | sysadmin/admin | checkBaseAccess | - | expandKeywordsSchema (max 200) + sanitizeForLlm | 安全 |
| `PUT /keywords/:id` | JWT | sysadmin/admin | checkBaseAccess | checkOwnership | updateKeywordSchema | 安全 |

后端防线完整，前端安全问题不会导致实际数据泄露或未授权操作。评分主要反映前端安全编码实践水平。

---

## 结论

**综合评分 4.6/10 — REQUEST CHANGES**

KeywordDetail.tsx 的后端安全防线完整（JWT + roleMiddleware + checkBaseAccess + checkOwnership + Zod），但前端安全编码存在两个 CRITICAL 问题：`handleSave` 绕过 Form 校验直接提交（SEC-C1），以及 Alert `title` prop 错误导致安全错误信息不可见（SEC-C2）。加上三套错误处理模式不一致（SEC-H1）、空 catch 吞掉错误（SEC-H2）和 `any` 类型（SEC-H4），前端安全实践整体偏弱。

建议优先修复 SEC-C1 和 SEC-C2（预计 15 分钟），然后处理 SEC-H1/H2/H4（预计 10 分钟），可使评分提升至 7.0/10。
