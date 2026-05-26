# KeywordDetail.tsx — 软件质量专家评审

**文件**: `pages/knowledge/KeywordDetail.tsx`
**评审日期**: 2026-05-26
**评审类型**: 软件质量评审（Quality Review）
**评审基线**: antd 5.x Alert API + 项目 `getApiErrorMessage`/`getSafeUser` 工具函数 + 其他详情页（ArticleDetail、TodoForm）对照

---

## 综合评分：3.8/10 — REQUEST CHANGES

2 项 CRITICAL 功能缺陷（Alert 组件 prop 错误导致错误信息不可见 + 表单校验完全绕过），3 项 HIGH 级别问题，4 项 MEDIUM 级别问题。阻断合并。

---

## 一、评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 类型安全 | 4/10 | 3 处显式 `any`，L26 内联复杂类型未提取 |
| 错误处理 | 3/10 | Alert prop 错误导致错误不可见；error handling 不一致；空 catch 吞错误 |
| 状态管理 | 6/10 | useState/useCallback 结构合理，但缺少 computed values 的 memoization |
| 代码结构 | 5/10 | handleSave 过长且分支重复；单组件承担创建/编辑/查看三种模式 |
| 性能优化 | 4/10 | canEdit/pagedWords/tableData/columns 全部无 memoization |
| 可访问性 | 3/10 | 零 aria-label，零键盘导航支持 |
| 可维护性 | 4/10 | 8 处 inline style，3 处重复 filter 模式 |
| 可测试性 | 4/10 | 混合关注点，6 个独立 API 调用点耦合在一个组件中 |

---

## 二、问题清单

### CRITICAL（阻断级）

#### C-1: Alert 组件使用 `title` prop 而非 `message`，错误信息不可见
- **位置**: L71, L189
- **现状**: `<Alert type="error" title="无效的知识库ID" ...>` 和 `<Alert type="error" title={error} ...>`
- **对照**: 项目中所有其他 Alert 使用均为 `message` prop：
  - `login/index.tsx:60`: `<Alert type="error" message={error} ...>`
  - `company/index.tsx:109`: `<Alert type="error" message={error} ...>`
  - `article/components/ArticleSettingsForm.tsx:64`: `<Alert type="error" message={error} ...>`
- **影响**: antd Alert 无 `title` prop，传入的字符串作为未知 HTML 属性挂载到 DOM 但不渲染。**用户遇到错误时无法看到任何提示信息**——"无效的知识库ID"、API 返回的错误消息均对用户不可见
- **修复**: 将两处 `title=` 改为 `message=`

#### C-2: 表单内置校验规则从未触发，`handleSave` 完全绕过 Form 验证
- **位置**: L105-146（handleSave）、L191（Form.Item rules）
- **现状**:
  - L191 定义了 `rules={[{ required: true, message: '种子词不能为空' }]}`
  - 但 `handleSave`（L105-146）从未调用 `form.validateFields()`，而是用 `form.getFieldValue('keyword')` 手动读取值
  - Form.Item 的 `rules` 和 `validateTrigger` 配置完全无效——表单下方的必填提示永远不会显示
- **对照**: `ArticleDetail.tsx:137-139` 使用 `form.validateFields().then(onValid).catch(...)`；`TodoForm.tsx:244` 使用 `await form.validateFields()`
- **影响**:
  1. 用户看不到 antd 的红色边框和必填提示
  2. 编辑模式下只检查 `keyword` 是否为空，遗漏了 Form 可扩展的校验能力
  3. 新建模式下的校验逻辑（L110-112 "请至少选择一个关键词"）与 Form 校验是割裂的两套系统
- **修复**: `handleSave` 中调用 `form.validateFields()` 并在 `.then()` 中执行提交逻辑，或使用 `await form.validateFields()` + try/catch

---

### HIGH（高优先级）

#### H-1: 错误处理方式不一致——`getApiErrorMessage` 与手动 `err.response?.data?.message` 混用
- **位置**: L50, L97（使用 `getApiErrorMessage`）vs L123-124, L143-144（使用 `err.response?.data?.message`）
- **现状**:
  ```typescript
  // L50: 使用了工具函数 ✓
  message.error(getApiErrorMessage(err, '加载失败'));
  // L97: 使用了工具函数 ✓
  message.error(getApiErrorMessage(err, '智能扩词失败'));
  // L123-124: 手动处理，且 err 类型为 any ✗
  setError(err.response?.data?.message || '保存失败');
  // L143-144: 同上 ✗
  setError(err.response?.data?.message || '保存失败');
  ```
- **影响**:
  1. `getApiErrorMessage` 对 5xx 错误做了 `console.error` 日志记录并隐藏内部错误，手动处理则暴露了可能的内部错误消息
  2. `handleSave` 中 `err` 类型声明为 `any`（L123, L143），绕过了 TypeScript 类型检查
  3. 新建和编辑分支的错误处理逻辑完全相同但重复写了两遍
- **修复**: 统一使用 `getApiErrorMessage(err, '保存失败')`，并将 `handleSave` 的两个 try 分支合并

#### H-2: 3 处显式 `any` 类型注解
- **位置**: L47 `(w: any)`、L123 `err: any`、L143 `err: any`
- **现状**:
  - L47: API 响应中 `expanded_words` 的元素类型应为 `{ id: number; word: string; selected: boolean }`，但 map 回调参数标注为 `any`
  - L123, L143: catch 的 `err` 类型为 `any`，而项目中已有 `getApiErrorMessage(err: unknown, ...)` 接受 `unknown` 类型
- **修复**: L47 使用正确的类型注解；L123/L143 删除 `err: any` 改为 `err: unknown` 并使用 `getApiErrorMessage`

#### H-3: 空 catch 吞错误
- **位置**: L59 `catch { /* ignore */ }`
- **现状**: `fetchBaseName` 请求知识库名称失败时，错误被完全忽略
- **影响**: 网络故障、认证过期、权限不足等情况全部静默失败，面包屑显示 `"..."` 但无任何诊断信息
- **修复**: 至少添加 `console.warn('[KeywordDetail] fetchBaseName failed:', err)` 级别的日志

---

### MEDIUM（中优先级）

#### M-1: 计算属性无 memoization——每次渲染重复计算
- **位置**: L76（`canEdit`）、L150（`pagedWords`）、L173（`tableData`）、L152-171（`columns`）
- **现状**: 4 个计算值在每次渲染时重新计算
  - `canEdit` 依赖 `isEditMode`、`user.role`、`isNew`、`data?.created_by`
  - `pagedWords` 依赖 `expandedWords`、`expandPage`
  - `tableData` 依赖 `pagedWords`
  - `columns` 依赖 `canEdit`
- **影响**: expandedWords 较大时，slice + map + 对象展开产生不必要的 GC 压力
- **修复**: 用 `useMemo` 包裹，deps 分别为对应依赖

#### M-2: `expandedWords.filter(w => w.selected)` 重复计算 4 次
- **位置**: L109、L228、L230
- **现状**:
  ```typescript
  L109: const selectedWords = expandedWords.filter(w => w.selected).map(w => w.word);
  L228: disabled={isNew && expandedWords.filter(w => w.selected).length === 0}
  L230: 保存{isNew && expandedWords.some(w => w.selected) ? ` (${expandedWords.filter(w => w.selected).length}个)` : ''}
  ```
- **影响**: L228 和 L230 在同一渲染周期内对同一数组执行了 3 次 filter/some 操作
- **修复**: 提取为 `const selectedCount = useMemo(() => expandedWords.filter(w => w.selected).length, [expandedWords])`

#### M-3: 8 处 inline style 对象
- **位置**: L185、L187、L189、L190、L192、L202、L211、L222
- **现状**: 全部使用 `style={{ ... }}` 内联对象
- **对照**: 项目中其他页面使用 CSS 类名（`className="page-container"`、`className="form-actions"`）
- **影响**: 内联样式对象在每次渲染时创建新引用，阻断 React 的浅比较优化；且违反项目 DESIGN.md 的 CSS 规范
- **修复**: 迁移到 `pages/styles/global.css` 中对应的 CSS 类

#### M-4: API 响应 `id` 字段被丢弃
- **位置**: L47
- **现状**: API 返回 `expanded_words` 包含 `{ id: number; word: string; selected: boolean }`，但 map 时丢弃了 `id`
- **影响**: 后续更新时无法按 ID 精确定位已有关键词，只能依赖 `word` 字符串匹配
- **修复**: `ExpandedWordItem` 接口添加 `id?: number` 并保留映射

---

### LOW（低优先级）

#### L-1: `getSafeUser()` 在每次渲染时调用
- **位置**: L24
- **现状**: `getSafeUser()` 每次渲染都执行 `localStorage.getItem` + `JSON.parse` + 类型校验
- **影响**: 轻微性能损耗，且组件无法感知用户身份变化（如其他标签页登出）
- **修复**: 将 `user` 存入 state 并通过 storage event 或 context 同步

#### L-2: Pagination onChange 包装函数冗余
- **位置**: L217
- **现状**: `onChange={(p) => setExpandPage(p)}` 可简化为 `onChange={setExpandPage}`
- **影响**: 微小的函数引用创建开销

#### L-3: `fetchData` useCallback 的 `isNew` 依赖不必要
- **位置**: L52
- **现状**: `isNew` 在组件生命周期内恒定不变，作为 useCallback 依赖不会触发任何重新创建
- **影响**: 无功能影响，仅语义上不准确

---

## 三、正面评价

1. **权限控制**: L76 `canEdit` 逻辑正确区分了 sysadmin / 创建者 / 查看者的编辑权限
2. **分页设计**: expanded words 的前端分页（L150, EXPAND_PAGE_SIZE=10）避免了大列表的 DOM 压力
3. **错误边界**: L67-74 对无效 baseId 做了前置拦截，避免后续 API 调用无效请求
4. **用户体验**: 智能扩词的追加模式（L91-94 过滤重复词）和保存按钮的选中计数（L230）提升了操作反馈

---

## 四、修复优先级建议

| 优先级 | 编号 | 预估工时 |
|--------|------|----------|
| P0 | C-1 Alert message prop | 5 分钟 |
| P0 | C-2 form.validateFields() | 15 分钟 |
| P1 | H-1 统一错误处理 | 10 分钟 |
| P1 | H-2 消除 any 类型 | 5 分钟 |
| P1 | H-3 空 catch 补日志 | 2 分钟 |
| P2 | M-1 useMemo 优化 | 10 分钟 |
| P2 | M-2 selectedCount 提取 | 5 分钟 |
| P2 | M-3 inline style 迁移 | 15 分钟 |
| P2 | M-4 保留 id 字段 | 5 分钟 |
