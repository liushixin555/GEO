# ArticleSettingsForm.tsx 架构评审

**文件**: `pages/article/components/ArticleSettingsForm.tsx` (109行)
**评审维度**: 架构（Architecture）
**评审日期**: 2026-05-26
**评审员**: 软件架构专家

---

## 总评: REQUEST CHANGES 5.0/10

ArticleSettingsForm.tsx 作为文章设置的表单组件，承担了两种编写模式（manual/ai）的表单渲染与交互控制。组件结构相对扁平，与父组件 ArticleDetail 的集成关系清晰。但架构层面存在 **Props 接口膨胀（17 个 props 违反 ISP）**、**writeMode 双向控制路径导致状态一致性风险**、**portraitMode 本地状态与 Form 受控模式冲突**、**条件渲染字段残留值未清理** 等核心问题。组件的可测试性和可维护性受制于紧耦合的 Props 接口，零测试覆盖进一步放大了架构缺陷的风险。

---

## 架构依赖关系图

```
ArticleDetail.tsx (父组件)
  ├─ Form.useForm() → form 实例
  ├─ useState('ai') → writeMode 状态
  ├─ useState([]) → imageList 状态
  ├─ useArticleDetail → detail.article/error/saving/loading
  ├─ useArticlePermissions → permissions.canEditSettings/canEditContent
  ├─ useKnowledgeBase → kb.* 系列数据
  ├─ useDocumentImport → docImport.importDocument
  │
  └─ ArticleSettingsForm ← 本次评审
       ├─ Props: 17 个（form/writeMode/kb数据/回调）
       ├─ Local State: portraitMode ('input'|'select')
       ├─ Form.Instance: form（外部注入，共享生命周期）
       ├─ ArticleImageManager（子组件）
       └─ antd: Form/Input/Select/Radio.Group/Upload/Segmented
```

**控制流**: ArticleDetail(状态持有者) → ArticleSettingsForm(渲染+交互) → ArticleDetail(回调处理)

---

## 阻断项 (BLOCKING)

### B-1: Props 接口膨胀——17 个参数违反接口隔离原则

**位置**: 第 12-31 行（Props 接口定义）

```typescript
interface ArticleSettingsFormProps {
  form: FormInstance;           // 表单实例
  isNew: boolean;               // 编辑状态
  editable: boolean;            // 权限状态
  saving: boolean;              // 异步状态
  error: string;                // 错误状态
  writeMode: WriteMode;         // UI 状态
  writeModeChange: (mode: WriteMode) => void;  // 回调
  imageList: string[];          // 业务数据
  imageListChange: (list: string[]) => void;    // 回调
  onErrorClear: () => void;     // 回调
  onSave: (values: ArticleFormValues) => void;  // 回调
  onImportDocument: (file: File) => void;       // 回调
  kbKeywords: KbKeyword[];      // 知识库数据
  kbPortraits: KbPortrait[];    // 知识库数据
  kbImages: KbImage[];          // 知识库数据
  kbLoading: boolean;           // 知识库状态
  skillsOptions: SkillOption[]; // 技能数据
  llmModelsOptions: LlmModelOption[]; // 模型数据
}
```

**问题**: 17 个 Props 混合了 5 种不同职责的关注点：

| 关注点 | Props 数量 | 示例 |
|--------|-----------|------|
| 表单控制 | 1 | form |
| UI 状态 | 3 | isNew, editable, saving, writeMode |
| 业务数据 | 5 | kbKeywords, kbPortraits, kbImages, skillsOptions, llmModelsOptions |
| 回调函数 | 5 | writeModeChange, imageListChange, onErrorClear, onSave, onImportDocument |
| 数据+状态 | 3 | imageList, error, kbLoading |

超过 7 个 Props 的组件通常意味着职责不清。17 个 Props 的直接后果：
1. **组件不可复用** — 与 ArticleDetail 的 hooks 输出强绑定
2. **测试成本极高** — 每个测试用例需构造 17 个参数的 mock
3. **修改脆弱** — 任何新增表单字段都需要在 Props 链路上穿透
4. **重构阻力** — 拆分或合并组件需同步修改 17 个参数的传递

**修复建议**: 将 Props 按关注点分组为聚合对象：

```typescript
interface ArticleSettingsFormProps {
  form: FormInstance;
  config: {
    isNew: boolean;
    editable: boolean;
    saving: boolean;
    writeMode: WriteMode;
    onWriteModeChange: (mode: WriteMode) => void;
  };
  knowledgeBase: {
    keywords: KbKeyword[];
    portraits: KbPortrait[];
    images: KbImage[];
    loading: boolean;
    skillsOptions: SkillOption[];
    llmModelsOptions: LlmModelOption[];
  };
  images: {
    list: string[];
    onChange: (list: string[]) => void;
  };
  callbacks: {
    onSave: (values: ArticleFormValues) => void;
    onImportDocument: (file: File) => void;
    onErrorClear: () => void;
  };
  error: string;
}
```

或更激进地引入 Context 模式，将知识库数据通过 Context 注入，避免每层手动传递。

---

### B-2: writeMode 双向控制路径——Form.Item 与受控 Prop 并存

**位置**: 第 43 行（Form.initialValues）+ 第 45-53 行（Form.Item write_mode）+ 第 47 行（onChange）

```typescript
// 路径 1: Form.Item 绑定 form 实例
<Form.Item name="write_mode" ...>
  <Radio.Group onChange={(e) => writeModeChange(e.target.value)} />
</Form.Item>

// 路径 2: 父组件通过 props 控制
const [writeMode, setWriteMode] = useState<WriteMode>('ai');
// → writeModeChange = setWriteMode

// 路径 3: Form initialValues 硬编码
initialValues={{ write_mode: 'ai' }}
```

**问题**: writeMode 存在三条控制路径：

```
Form.initialValues('ai') → Form.Item(name='write_mode') → form.getFieldValue('write_mode')
                                                                    ↕
Radio.Group.onChange → writeModeChange prop → 父组件 setWriteMode → writeMode prop → 条件渲染
```

这三条路径形成了一个隐式的双向绑定：
1. **Form 存储 write_mode** — 通过 Form.Item 的 name 绑定
2. **父组件存储 writeMode** — 通过 useState + props 传递
3. **两者通过 onChange 同步** — 但这是弱契约，没有保证一致性

风险场景：
- `detail.article.write_mode` 从后端加载（如 `'manual'`），但 Form 的 `initialValues` 硬编码为 `'ai'`（第 43 行）
- 父组件 useEffect（ArticleDetail.tsx 第 42-43 行）调用 `setWriteMode` 更新了 prop，但 Form 实例中的 `write_mode` 字段可能仍为 `'ai'`
- 表单提交时 `form.getFieldsValue()` 取的是 Form 存储的值，而非 prop 的值

**修复建议**: 选择单一控制源：

方案 A（推荐） — writeMode 完全由 Form 控制，移除 prop：
```typescript
// 组件内通过 form.getFieldValue 获取当前值
const writeMode = Form.useWatch('write_mode', form) || 'ai';
// 条件渲染基于 form 值，不需要 prop
```

方案 B — writeMode 完全受控，移除 Form.Item name 绑定：
```typescript
// Radio.Group 直接受控
<Radio.Group value={writeMode} onChange={...} />
// submit 时手动组装 values
```

---

## 高优先级 (HIGH)

### H-1: portraitMode 本地状态与 Form 受控模式冲突

**位置**: 第 39 行（useState）+ 第 77 行（onChange）+ 第 79 行（Form.Item）

```typescript
const [portraitMode, setPortraitMode] = useState<'input' | 'select'>('select');

// 切换时手动清空
onChange={(val) => {
  setPortraitMode(val as 'input' | 'select');
  form.setFieldValue('portrait', undefined);
}}

// portrait 的 Form.Item 无条件渲染
<Form.Item name="portrait" style={{ marginBottom: 0 }}>
```

**问题**:
1. `portraitMode` 状态在组件外部不可见、不可控、不可持久化 — 父组件无法感知当前模式
2. 编辑已有文章时，若 portrait 值来自知识库选择（select），`portraitMode` 默认为 `'select'` 是对的；但若 portrait 值是手动输入的自定义文本，初始状态仍为 `'select'`，用户看到的 Select 组件无法匹配现有值
3. `form.setFieldValue('portrait', undefined)` 绕过了 antd 的表单生命周期，不会触发 `onValuesChange` 或校验状态更新

**修复建议**:
- 根据 portrait 初始值智能推断 portraitMode：
```typescript
const inferPortraitMode = (val?: string, kbPortraits?: KbPortrait[]) =>
  val && kbPortraits?.some(p => p.value === val) ? 'select' : 'input';
```
- 或将 portraitMode 提升为 prop，由父组件管理

---

### H-2: 条件渲染字段残留值——提交数据污染风险

**位置**: 第 54 行（manual 分支）+ 第 69 行（ai 分支）

```typescript
{writeMode === 'manual' && (
  <Form.Item name="title" ...>  // 仅 manual 模式显示
)}

{writeMode === 'ai' && (<>
  <Form.Item name="portrait" ...>   // 仅 ai 模式显示
  <Form.Item name="skills" ...>     // 仅 ai 模式显示
  <Form.Item name="llm_model_id" ...> // 仅 ai 模式显示
</>)}
```

**问题**: 条件渲染仅控制 UI 可见性，不控制 Form 实例中的字段值。当用户在 AI 模式填写了 `portrait`/`skills`/`llm_model_id` 后切换到 manual 模式：
1. 这些字段从 DOM 中移除（条件渲染为 false）
2. 但 Form 实例中仍然保留这些值
3. `form.validateFields()` 和 `form.getFieldsValue()` 仍会包含这些隐藏字段的值
4. 提交到后端的数据包含模式不匹配的字段

反之，manual 模式的 `title` 切换到 AI 模式后也会残留。

**修复建议**: 在模式切换回调中清理无关字段：

```typescript
const handleWriteModeChange = (mode: WriteMode) => {
  writeModeChange(mode);
  if (mode === 'manual') {
    form.setFieldsValue({ portrait: undefined, skills: undefined, llm_model_id: undefined });
  } else {
    // AI 模式不强制清 title，但应根据业务判断
  }
};
```

或在 `onSave` 提交前根据当前模式过滤字段：

```typescript
const handleSave = (values: ArticleFormValues) => {
  const cleaned = writeMode === 'manual'
    ? { ...values, portrait: undefined, skills: undefined, llm_model_id: undefined }
    : values;
  onSave(cleaned);
};
```

---

### H-3: 导入按钮架构异味——交互控件嵌在 Form.Item label 中

**位置**: 第 56-61 行

```typescript
<Form.Item
  name="title"
  label={
    <Space size={8}>
      <span>标题</span>
      <Upload accept=".md,.doc,.docx" showUploadList={false}
        beforeUpload={(file) => { onImportDocument(file); return false; }}>
        <Button type="link" size="small" icon={<ImportOutlined />}
          style={{ padding: 0, height: 'auto', fontSize: 12, verticalAlign: 'middle' }}>
          导入
        </Button>
      </Upload>
    </Space>
  }
>
```

**问题**:
1. **语义违规** — `label` 属性的语义是"字段描述文本"，嵌套一个完整的 `Upload + Button` 组件链将交互控件伪装成了标签
2. **可访问性破坏** — 屏幕阅读器将"导入"按钮作为标签的一部分朗读，语义混乱
3. **样式覆盖复杂** — 需要 5 个 inline style 属性（padding, height, fontSize, verticalAlign）来让按钮看起来像标签的一部分
4. **单行 280+ 字符** — 可读性极差

**修复建议**: 将导入按钮从 label 中抽出，放在 Form.Item 的 `extra` 属性或独立行：

```typescript
<Form.Item
  name="title"
  label="标题"
  extra={
    <Upload accept=".md,.doc,.docx" showUploadList={false}
      beforeUpload={(file) => { onImportDocument(file); return false; }}>
      <Button type="link" size="small" icon={<ImportOutlined />}>导入文档</Button>
    </Upload>
  }
>
```

或使用 Form.Item 的 `label` 与独立 `<div>` 并列布局。

---

### H-4: Form.Item 嵌套违反 antd 架构模式

**位置**: 第 70-86 行

```typescript
<Form.Item label="画像">                    {/* 外层：无 name，纯布局 */}
  <Segmented ... />                          {/* 模式切换 */}
  <Form.Item name="portrait" style={{ marginBottom: 0 }}>  {/* 内层：实际表单字段 */}
    ...
  </Form.Item>
</Form.Item>
```

**问题**:
1. 外层 `Form.Item` 无 `name` 属性，将其用作布局容器。antd 的 `Form.Item` 不是设计为布局组件，其内部包含表单校验的 CSS 和 DOM 结构（如 `.ant-form-item-control`）
2. 内层 `Form.Item` 的 `style={{ marginBottom: 0 }}` 是为了覆盖外层 Form.Item 产生的额外间距，属于补丁式修复
3. 在 antd 的 Form 校验流程中，嵌套的无 name `Form.Item` 可能干扰校验消息的显示和字段路径的计算

**修复建议**: 外层改用 `<div>` 或 antd `<Space>` + 自定义 label：

```typescript
<div style={{ marginBottom: 24 }}>
  <label style={{ display: 'inline-block', marginBottom: 8 }}>画像</label>
  <Segmented ... />
  <Form.Item name="portrait" noStyle>
    ...
  </Form.Item>
</div>
```

---

### H-5: onSave 无二次提交防护——saving 状态未在组件内使用

**位置**: 第 43 行 `<Form ... onFinish={onSave}>` + 第 16 行 `saving: boolean`

**问题**:
- `saving` 通过 Props 传入组件但组件内未使用
- 提交按钮在父组件 ArticleDetail 中（第 211-225 行），依赖父组件正确使用 `saving` 禁用按钮
- 但 `Form.onFinish` 可以通过 Enter 键触发（若表单内有 focus 的 input），绕过按钮的 disabled 状态
- 组件将防护责任完全推给了调用方，违反了"最小惊讶原则"

**修复建议**: 在 Form 的 onFinish 中添加防护：

```typescript
<Form form={form} onFinish={(values) => { if (!saving) onSave(values); }} ...>
```

---

## 中优先级 (MEDIUM)

### M-1: React.memo 与函数 Props 不兼容——浅比较永远 false

**位置**: 第 108 行

```typescript
export default React.memo(ArticleSettingsForm);
```

**问题**: Props 中包含 6 个函数（writeModeChange, imageListChange, onErrorClear, onSave, onImportDocument）和 5 个数组/对象（kbKeywords, kbPortraits, kbImages, skillsOptions, llmModelsOptions）。父组件 ArticleDetail 每次渲染时：
- 函数 Props 除非被 useCallback 包裹，否则每次创建新引用
- 数组 Props 除非被 useMemo 包裹，否则每次创建新引用

查看 ArticleDetail.tsx，这些 Props 均未被 `useCallback`/`useMemo` 优化（如 `onErrorClear: () => detail.setError('')` 每次渲染创建新闭包）。`React.memo` 的浅比较几乎永远返回 false，等于无效。

**修复建议**: 要么在父组件优化引用稳定性，要么移除 `React.memo`（承认当前无优化效果），要么提供自定义比较函数。

---

### M-2: 关键字和技能字段的表单-类型-后端三元不一致

**位置**: 第 66-67 行（keywords）+ 第 96-97 行（skills）

```typescript
// keywords — ArticleFormValues 中类型为 string（单值）
<Form.Item name="keywords">
  <Select showSearch options={kbKeywords} />  // 无 mode="multiple"，单选

// skills — ArticleFormValues 中类型为 number[]（数组）
<Form.Item name="skills">
  <Select options={skillsOptions} allowClear />  // 无 mode="multiple"，单选
```

**问题**:
- `skills: number[]` 与 `<Select>` 无 `mode="multiple"` 构成类型-控件矛盾
- `keywords: string` 与 `<Select>` 单选匹配，但业务上"关键词"暗示多选
- 后端 `ArticleData.keywords` 类型为 `string | null`，与前端 `string` 类型一致但不含 `undefined`

这三层（前端类型、控件配置、后端类型）在 skills 和 keywords 上均存在不一致。

---

### M-3: 错误展示仅依赖 Alert — 无错误恢复策略

**位置**: 第 44 行

```typescript
{error && <Alert type="error" message={error} className="form-alert" showIcon closable onClose={onErrorClear} />}
```

**问题**:
1. 错误处理策略是"展示 + 手动关闭"，没有自动消失、字段级错误定位、或错误重试机制
2. `onErrorClear` 仅清除错误文本，不修复导致错误的根本原因（如网络故障、校验失败）
3. 表单提交失败后，用户看到 Alert 但不知道哪些字段需要修改
4. antd Form 支持字段级错误（`form.setFields([{ name, errors }]`），但未被使用

---

### M-4: 缺少 loading 态与骨架屏

**位置**: 全组件

**问题**: 当 `kbLoading=true` 时，Select 组件显示了 `loading` 属性和 `notFoundContent`，但其他表单字段（title、article_type）始终可交互。在知识库数据加载完成前，用户可能已经填写了部分表单但无法提交（因为 keywords 是 required）。这种不一致的加载状态可能导致用户困惑。

---

### M-5: 组件无法独立测试——零测试覆盖

**位置**: 整个组件

**问题**: 虽然已有质量评审（B-1）指出此问题，但从架构角度看，零测试的根本原因是组件的可测试性差：
1. 17 个 Props 使 mock 成本极高
2. 依赖外部注入的 Form 实例，需要在测试中创建完整的 Form 上下文
3. 子组件 ArticleImageManager 也需要 mock
4. 缺少明确的测试边界和可观察的行为契约

---

## 低优先级 (LOW)

### L-1: App 导入未使用

**位置**: 第 4 行 `import { ..., App } from 'antd'`

`App` 被导入但组件中未使用 `App.useApp()`。应移除或用于 message 替代。

### L-2: initialValues 硬编码 'ai' 与父组件默认值重复

**位置**: 第 43 行 `initialValues={{ write_mode: 'ai' }}`

父组件 `useState<WriteMode>('ai')` 和 Form 的 `initialValues` 各自硬编码了相同的默认值，形成冗余的默认值声明。

### L-3: inline style 散布违反 DESIGN.md 规范

**位置**: 第 57 行（Button 的 5 个 inline style）、第 73 行（Segmented marginBottom）、第 79 行（Form.Item marginBottom: 0）

项目铁律要求遵循 DESIGN.md，inline style 应通过 CSS class 或 antd token 替代。

---

## 正面评价

| 维度 | 评价 |
|------|------|
| **结构清晰** | 组件内无复杂逻辑，纯渲染组件，阅读成本低 |
| **antd 合规** | 全部使用 antd 组件（Form/Input/Select/Radio.Group/Upload/Segmented），符合项目铁律 |
| **条件渲染策略** | manual/ai 两种模式的字段分离清晰，通过 writeMode 条件渲染控制 |
| **React.memo 意识** | 虽然当前无效，但表明开发者有性能优化意识 |
| **图片管理解耦** | ArticleImageManager 作为独立子组件，职责分离合理 |
| **disabled 统一** | 所有表单控件通过 `editable` prop 统一控制可编辑状态 |

---

## 架构问题汇总

| 优先级 | 编号 | 问题 | 架构原则违反 | 工时 |
|--------|------|------|-------------|------|
| BLOCKING | B-1 | 17 Props 接口膨胀 | 接口隔离原则(ISP) | 1.5h |
| BLOCKING | B-2 | writeMode 双向控制路径 | 单一数据源(SSOT) | 1h |
| HIGH | H-1 | portraitMode 与 Form 冲突 | 受控组件模式 | 45min |
| HIGH | H-2 | 条件渲染字段残留值 | 数据一致性 | 30min |
| HIGH | H-3 | 导入按钮嵌在 label 中 | 语义正确性 | 30min |
| HIGH | H-4 | Form.Item 无 name 嵌套 | antd 架构模式 | 20min |
| HIGH | H-5 | saving 状态未使用 | 防御性编程 | 15min |
| MEDIUM | M-1 | React.memo 无效 | 性能优化有效性 | 30min |
| MEDIUM | M-2 | skills/keywords 类型三元不一致 | 类型安全 | 30min |
| MEDIUM | M-3 | 错误仅 Alert 展示 | 用户体验架构 | 1h |
| MEDIUM | M-4 | 缺少 loading 态管理 | 加载状态一致性 | 30min |
| MEDIUM | M-5 | 可测试性差 | 可测试性设计 | 2h |
| LOW | L-1~L-3 | 未使用导入/硬编码/inline style | 代码清洁度 | 15min |

**总修复工时**: 约 8.5h

---

## 修复优先级路线图

### P0 — 架构重构（阻断后续功能开发质量）
1. **B-1**: 重构 Props 接口，按关注点分组为聚合对象
2. **B-2**: 选择 writeMode 单一控制源，消除双向绑定

### P1 — 本迭代修复
3. **H-1**: portraitMode 智能推断初始值或提升为 prop
4. **H-2**: 模式切换时清理无关字段值
5. **H-3**: 导入按钮从 label 移至 extra 或独立布局
6. **H-4**: 外层 Form.Item 改为 div
7. **H-5**: onFinish 中添加 saving 防护

### P2 — 下一迭代
8. **M-1**: 父组件 useCallback/useMemo 或移除 React.memo
9. **M-2**: skills 添加 mode="multiple"，确认 keywords 业务需求
10. **M-5**: 创建测试文件，目标覆盖率 ≥ 85%

---

## 修复后预期评分

完成 P0（Props 重构 + writeMode 单一控制源）后: **7.0/10**
完成 P0 + P1（全部 HIGH 修复）后: **7.5/10**
完成全部修复后: **8.5/10**
