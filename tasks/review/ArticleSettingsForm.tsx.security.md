# ArticleSettingsForm.tsx 安全评审

**文件**: `pages/article/components/ArticleSettingsForm.tsx`
**评审类型**: 代码安全评审
**评审日期**: 2026-05-26
**评审结论**: **CONDITIONAL APPROVE 5.5/10** — 前端表单组件存在2项HIGH安全风险：文件导入零MIME校验+.md路径无sanitize(H1)+writeMode切换不清理残留字段导致脏数据提交(H2)，以及4项MEDIUM风险：disabled仅UI限制无纵深防御(M1)+saving未使用导致无防重复提交(M2)+文件名未sanitization(M3)+skills单选/多选类型不匹配(M4)

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 输入验证 | 4/10 | 文件导入无MIME校验、表单字段无长度限制、skills类型不匹配 |
| XSS防护 | 7/10 | antd组件默认转义、Alert转义、无dangerouslySetInnerHTML；但.md导入路径跳过DOMPurify |
| 文件上传安全 | 3/10 | accept仅浏览器提示、组件层零校验、MIME未检查、.md内容无sanitize |
| 授权与访问控制 | 5/10 | editable/disabled仅UI层限制，无纵深防御；后端应兜底但前端应协作 |
| 数据完整性 | 4/10 | writeMode切换不清理残留字段、嵌套Form.Item值可能不一致 |
| 防重复提交 | 3/10 | saving prop未使用、onFinish无debounce、用户可双击触发多次API调用 |

---

## 威胁模型

```
用户 ──→ "导入"按钮 ──→ Upload(beforeUpload) ──→ onImportDocument(file)
              │                                     │
              │  accept仅浏览器提示                   ├─ .md → file.text() → 无sanitize → XSS/注入
              │  可绕过                              │
              │                                     └─ 任意文件改名.md → 绕过扩展名校验
              │
用户 ──→ 切换writeMode(ai→manual) ──→ portrait/skills/llm_model_id残留
              │
              ├──→ 提交表单 ──→ 脏数据(payload含隐藏字段值) ──→ 后端处理异常
              │
用户 ──→ 快速双击提交 ──→ 多次onFinish ──→ 多次API POST ──→ 重复创建文章
              │
攻击者 ──→ DevTools移除disabled ──→ 修改已锁定字段 ──→ 提交篡改数据
```

---

## 详细发现

### CRITICAL (0项)

无。前端表单组件的致命安全漏洞通常需要配合后端缺陷才能利用。

### HIGH (2项)

**H-1: 文件导入零MIME校验 + .md路径无sanitize — 内容注入/XSS风险**
- **位置**: L57 `beforeUpload={(file) => { onImportDocument(file); return false; }}`
- **问题**: 三层安全缺陷叠加：
  1. **组件层零校验**: `beforeUpload` 回调直接传递 `file` 给 `onImportDocument`，无任何格式/大小/类型检查
  2. **accept仅浏览器提示**: `accept=".md,.doc,.docx"` 可通过修改请求或拖拽绕过
  3. **.md路径无sanitize**: `useDocumentImport` hook中，`.md` 文件通过 `file.text()` 读取原始内容后直接传给 `onContentImport`，**不经DOMPurify处理**。对比 `.docx` 路径使用了 `DOMPurify.sanitize()` (L31-34)
- **攻击向量**:
  - **路径A — 恶意Markdown注入**: 上传包含 `[link](javascript:alert(1))` 或 `<script>` 标签的 .md 文件 → 原始文本注入文章内容 → 若Markdown渲染器未严格过滤则触发XSS
  - **路径B — 任意文件伪装**: 将恶意HTML文件重命名为 .md → 扩展名校验通过 → `file.text()` 读取为原始HTML → 同上
  - **路径C — 路径穿越**: 文件名含 `../` 或特殊字符 → 虽然前端不写文件系统，但文件名可能被记录到日志或展示给其他用户
- **根因**: 组件层将文件校验完全委托给hook，但hook只检查扩展名不检查MIME type，且.md路径被假定为"安全文本"而跳过sanitize
- **修复**:
```tsx
// ArticleSettingsForm.tsx — 组件层添加基础校验
const ALLOWED_MIME_TYPES = ['text/markdown', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

<Upload
  accept=".md,.doc,.docx"
  showUploadList={false}
  beforeUpload={(file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(md|doc|docx)$/i)) {
      App.useApp().message.error('不支持的文件类型');
      return false;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      App.useApp().message.error('文件大小不能超过10MB');
      return false;
    }
    onImportDocument(file);
    return false;
  }}
>
```
```typescript
// useDocumentImport.ts — .md路径也需要sanitize
if (ext === 'md') {
  const rawText = await file.text();
  // 基础sanitize：移除可能的HTML标签
  markdown = rawText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, (match) => {
      // 仅允许安全的markdown内联HTML
      if (/^<(br|hr|em|strong|code|pre)\s*\/?>$/i.test(match.trim())) return match;
      return '';
    });
}
```

**H-2: writeMode切换不清理残留字段 — 脏数据提交**
- **位置**: L46-53 `writeMode` Radio.Group onChange / L69-102 条件渲染
- **问题**: 当用户切换writeMode时（如 ai → manual → ai），之前模式的表单字段值不会被清理：
  - `portrait` (画像): L77 仅在 `portraitMode` 切换时清理，**不在 writeMode 切换时清理**
  - `skills` (技能): L97 无任何清理逻辑
  - `llm_model_id` (大模型): L99 无任何清理逻辑
  - `keywords` (关键词): L66 不受writeMode影响，始终保留（合理）
- **攻击场景**:
  1. 用户在AI模式填写完整表单（含敏感画像portrait）
  2. 切换到manual模式（portrait/skills/llm_model_id的Form.Item被移除但值仍在form store中）
  3. 提交manual模式表单
  4. `onSave` 收到的 `values` 包含已不可见的 portrait/skills/llm_model_id
  5. `saveSettings` 将这些隐藏值发送到API：`portrait: values.portrait?.trim() || undefined`
  6. 后端可能接受并存储这些"幽灵数据"
- **数据安全影响**: 用户可能无意中提交了不应提交的敏感业务数据（如画像描述），违反最小数据原则
- **修复**:
```tsx
<Radio.Group
  onChange={(e) => {
    const newMode = e.target.value as WriteMode;
    writeModeChange(newMode);
    // 清理另一模式的字段值
    if (newMode === 'manual') {
      form.setFieldsValue({ portrait: undefined, skills: undefined, llm_model_id: undefined });
    } else {
      form.setFieldsValue({ title: undefined });
    }
  }}
  disabled={!editable}
  optionType="button"
  buttonStyle="solid"
  options={[{ label: '手工编写', value: 'manual' }, { label: 'AI生成', value: 'ai' }]}
/>
```

### MEDIUM (4项)

**M-1: disabled仅UI层限制 — 无前端权限纵深防御**
- **位置**: L48 `disabled={!editable}` / L60 `disabled={!editable}` / L64 `disabled={!editable}` / L81 `disabled={!editable}` / L97 `disabled={!editable}` / L100 `disabled={!editable}`
- **问题**: 所有表单控件通过 `disabled` prop 限制编辑。攻击者可通过以下方式绕过：
  1. 浏览器DevTools: `$0.disabled = false` 或移除disabled属性
  2. 浏览器扩展: 自动启用disabled表单元素
  3. 直接构造HTTP请求: 跳过前端直接调用API
- **纵深防御缺失**: 组件未在 `onFinish` 回调中校验 `editable` 状态
  ```tsx
  // 当前：直接调用onSave
  onFinish={onSave}
  // 应该：
  onFinish={(values) => { if (!editable) return; onSave(values); }}
  ```
- **当前缓解**: 后端API应有权限校验（需验证）
- **影响**: 单独利用风险有限，但与其他漏洞组合可能放大攻击面

**M-2: saving prop未使用 — 无防重复提交保护**
- **位置**: L16 `saving: boolean` / L34 解构 `saving` 但 JSX 中零引用
- **问题**: `saving` prop 从父组件传入但在组件内完全未使用。本应用于：
  1. 提交按钮loading状态
  2. 表单整体disabled防止重复提交
- **实际影响**: 用户可快速多次点击提交 → `onFinish` 被多次触发 → 多次API调用
  - 新建文章场景（`isNew=true`）: 可能创建多篇重复文章
  - 更新文章场景: 可能产生竞态条件
- **修复**:
```tsx
<Form form={form} onFinish={(values) => { if (saving) return; onSave(values); }} ...>
```
或在提交按钮上（注：当前组件内无提交按钮，按钮在父组件 ArticleDetail.tsx 中）

**M-3: 文件名未经sanitization直接展示**
- **位置**: L57 Upload → useDocumentImport hook → `message.success('已导入文档「${file.name}」')`
- **问题**: `file.name` 可能包含特殊字符（虽然antd message默认转义HTML）：
  - 极长文件名（如10000字符）可能导致UI溢出
  - 特殊Unicode字符可能导致文本渲染异常（RTL override等）
- **当前缓解**: antd message组件对内容做HTML转义
- **修复**:
```typescript
const safeName = file.name.replace(/[<>\"'&]/g, '').slice(0, 100);
message.success(`已导入文档「${safeName}」`);
```

**M-4: skills Select缺少mode="multiple" — 类型不匹配**
- **位置**: L97 `<Select placeholder="选择关联技能" options={skillsOptions} disabled={!editable} allowClear />`
- **问题**: `ArticleFormValues.skills` 类型定义为 `number[]`（数组），但 Select 组件缺少 `mode="multiple"`：
  - 提交时 skills 值为单个 number 而非 number[]
  - 后端期望数组但收到单值，可能导致类型错误或数据丢失
  - 如果后端对 skills 做 JSON.parse 或 Array.isArray 检查，可能导致500错误
- **修复**:
```tsx
<Select placeholder="选择关联技能" options={skillsOptions} disabled={!editable} allowClear mode="multiple" />
```

### LOW (3项)

**L-1: 无输入长度限制**
- **位置**: L60 `<Input placeholder="请输入文章标题..." />` / L83 `<Input.TextArea placeholder="输入画像描述" />`
- **问题**: title 和 portrait 字段无 maxLength 限制：
  - 极端长的输入可能导致性能问题或后端拒绝
  - title 通常应有合理长度上限（如200字符）
- **修复**: `<Input maxLength={200} showCount />` / `<Input.TextArea maxLength={2000} showCount />`

**L-2: initialValues硬编码write_mode**
- **位置**: L43 `initialValues={{ write_mode: 'ai' }}`
- **问题**: 硬编码 `'ai'` 作为默认值。如果后端默认值变化或管理员配置不同默认值，前端将与之不一致
- **风险**: 低 — 仅影响新建文章的初始状态
- **修复**: 从配置或后端获取默认值

**L-3: 嵌套Form.Item — antd反模式**
- **位置**: L70 `<Form.Item label="画像">` 内嵌套 L79 `<Form.Item name="portrait">`
- **问题**: antd 官方不推荐无name的Form.Item嵌套有name的Form.Item，可能导致：
  - 表单验证在嵌套层级中行为不一致
  - 条件渲染切换时字段值处理异常
  - antd未来版本可能更改嵌套行为
- **修复**: 使用 `<div>` 替代外层无name的 Form.Item：
```tsx
<div className="form-item-wrapper">
  <label className="form-label">画像</label>
  <Segmented ... />
  <Form.Item name="portrait" style={{ marginBottom: 0 }}>
    ...
  </Form.Item>
</div>
```

---

## 攻击面分析

### 调用链安全验证

```
用户点击"导入" → Upload.beforeUpload (零校验 ✗)
  → onImportDocument(file)
    → useDocumentImport:
      ├─ 扩展名校验: file.name.split('.').pop() (可绕过 ⚠)
      ├─ 大小校验: 10MB ✓
      ├─ .md路径: file.text() → 无sanitize ✗
      └─ .docx路径: mammoth → DOMPurify.sanitize ✓

用户切换writeMode → writeModeChange(setWriteMode)
  → 表单条件渲染切换
  → portrait/skills/llm_model_id值仍保留在form store ✗
  → 用户提交 → onSave(values) → 包含隐藏字段脏数据 ✗

用户提交表单 → Form.onFinish
  → 无saving防重复提交保护 ✗
  → 无editable状态二次校验 ✗
  → onSave(values)
    → handleSave → saveSettings → apiClient.post/put
      → 后端权限校验 (需验证)
```

### 安全边界总结

| 边界 | 保护措施 | 状态 |
|------|----------|------|
| 文件类型限制 | accept属性 | ❌ 仅浏览器提示 |
| 文件大小限制 | useDocumentImport hook 10MB | ✅ 有效 |
| 文件MIME校验 | 无 | ❌ 完全缺失 |
| .md内容sanitize | 无 | ❌ DOMPurify仅用于.docx |
| 文件名XSS | antd message转义 | ✅ 当前安全 |
| 表单输入XSS | antd组件默认转义 | ✅ 安全 |
| 编辑权限控制 | disabled属性 | ⚠ 仅UI层，无纵深防御 |
| 防重复提交 | saving prop(未使用) | ❌ 无保护 |
| 字段残留清理 | 无 | ❌ writeMode切换时残留 |
| 输入长度限制 | 无 | ⚠ 仅后端限制 |

---

## 与已有评审的关联

| 发现项 | 质量评审(5.2/10) | 架构评审(5.0/10) | 安全评审 | 说明 |
|--------|----------|----------|----------|------|
| 文件导入无校验 | BLOCKING: 导入文件无校验 | HIGH: 导入嵌在label | **H-1** | 安全视角关注MIME+sanitize缺失 |
| skills多选缺失 | HIGH: skills多选缺失 | - | **M-4** | 安全视角关注类型不匹配导致后端异常 |
| Form.Item嵌套 | HIGH: Form.Item嵌套 | - | **L-3** | 安全视角关注验证和值一致性 |
| saving未使用 | HIGH: saving未使用 | - | **M-2** | 安全视角关注无防重复提交 |
| 17 Props膨胀 | - | BLOCKING: 17 Props | - | 架构问题，非安全范畴 |
| 模式切换残留 | - | HIGH: 字段残留值 | **H-2** | 安全视角关注脏数据提交到API |
| 模式切换残留 | - | HIGH: writeMode双向控制 | **H-2** | 同上，安全+架构双重视角 |

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | H-1: 文件导入MIME校验 + .md路径sanitize | 1.5h |
| P0 | H-2: writeMode切换清理残留字段 | 30min |
| P1 | M-1: onFinish内editable二次校验 | 15min |
| P1 | M-2: onFinish内saving防重复提交 | 15min |
| P1 | M-4: skills Select添加mode="multiple" | 5min |
| P2 | M-3: 文件名sanitization | 15min |
| P2 | L-1~L-3: 输入长度+initialValues+嵌套Form.Item | 30min |
| **总计** | | **~3.5h** |

---

## 修复后预期评分

| 修复范围 | 预期评分 |
|----------|----------|
| 仅修复H-1 + H-2（P0核心安全项） | 7.0/10 |
| 修复全部HIGH + MEDIUM | 8.0/10 |
| 修复全部发现项 | 8.5/10 |

---

## 总结

`ArticleSettingsForm.tsx` 作为前端表单组件，利用antd组件库的默认XSS防护（组件内转义）避免了大多数注入风险。但存在2项HIGH安全风险：(1) 文件导入功能在组件层零校验，且 `.md` 路径完全跳过DOMPurify sanitize，恶意内容可直接注入文章；(2) writeMode切换时不清理另一模式的表单字段值，导致用户可能无意中提交包含敏感画像等"幽灵数据"的payload。此外，`saving` prop 未使用导致无防重复提交保护，`disabled` 仅做UI层限制缺乏纵深防御。修复H-1（MIME校验+sanitize）和H-2（模式切换清理）两项核心安全项后评分可达7.0/10，全面修复后可达8.5/10。
