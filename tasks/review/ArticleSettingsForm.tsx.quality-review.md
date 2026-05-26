# ArticleSettingsForm.tsx 质量评审

**文件**: `pages/article/components/ArticleSettingsForm.tsx`
**评审类型**: 软件质量评审（Quality Review）
**评审日期**: 2026-05-26
**评审模型**: Claude (GLM-5.1)

---

## 综合评分：5.2/10 — CONDITIONAL APPROVE

> 组件结构清晰、职责相对聚焦，但存在零测试覆盖、表单校验不完整、控件缺失、inline style 违反 DESIGN.md 等 2 项 BLOCKING + 5 项 HIGH + 6 项 MEDIUM 问题。修复后预期可达 7.5/10。

---

## B — BLOCKING（2 项）

### B-1: 零测试覆盖

**位置**: 整个组件
**问题**: 组件无任何测试文件（`tests/pages/article/components/ArticleSettingsForm.test.tsx` 不存在）。一个包含 8 个表单字段、2 种编写模式、2 种画像输入模式、文件导入、图片管理的表单组件完全没有质量保障。
**风险**: 任何重构或需求变更都可能引入回归缺陷而无法自动检测。
**修复建议**:
- 创建 `tests/pages/article/components/ArticleSettingsForm.test.tsx`
- 最少覆盖：渲染/模式切换/表单校验/导入回调/画像模式切换/提交
- 目标覆盖率 ≥ 85%

### B-2: `onImportDocument` 缺少文件类型和大小校验

**位置**: 第 57 行
```tsx
beforeUpload={(file) => { onImportDocument(file); return false; }}
```
**问题**: Upload 组件虽然通过 `accept=".md,.doc,.docx"` 限制了文件选择器，但 `beforeUpload` 回调中并未对 `file.type` 和 `file.size` 进行二次校验。用户可通过修改请求绕过前端限制上传任意文件。
**修复建议**:
```tsx
beforeUpload={(file) => {
  const VALID_TYPES = [
    'text/markdown', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (!VALID_TYPES.includes(file.type) && !file.name.match(/\.(md|doc|docx)$/i)) {
    message.error('仅支持 .md、.doc、.docx 格式文件');
    return false;
  }
  if (file.size > MAX_SIZE) {
    message.error('文件大小不能超过 10MB');
    return false;
  }
  onImportDocument(file);
  return false;
}}
```

---

## H — HIGH（5 项）

### H-1: `skills` 多选模式与类型定义不匹配

**位置**: 第 96-97 行
```tsx
<Form.Item name="skills" label="选择技能">
  <Select placeholder="选择关联技能" options={skillsOptions} disabled={!editable} allowClear />
</Form.Item>
```
**问题**: `SkillOption.value` 类型为 `number`，`ArticleFormValues.skills` 类型为 `number[]`，但 `<Select>` 未设置 `mode="multiple"`。这将导致用户只能选择单个技能值，与 `number[]` 类型契约矛盾——表单提交时类型不匹配。
**修复建议**: 添加 `mode="multiple"` 或将类型改为 `number | undefined`。

### H-2: `keywords` 多选模式与类型定义不匹配

**位置**: 第 66-67 行
```tsx
<Form.Item name="keywords" label="关键词" rules={[{ required: true, message: '关键词不能为空' }]}>
  <Select showSearch placeholder="从知识库选择关键词" options={kbKeywords} ... />
</Form.Item>
```
**问题**: 与 H-1 类似，`keywords` 在 `ArticleFormValues` 中类型为 `string`（单个值），但业务上通常需要多个关键词。若后端期望数组，则类型定义和控件都需调整；若确实只选一个关键词，UI 文案"关键词"暗示可选多个，有误导性。
**修复建议**: 确认业务需求。若需多选，添加 `mode="multiple"` 并更新类型为 `string[]`；若单选，更新 label 为"关键词（单选）"或"主关键词"。

### H-3: `Form.Item` 嵌套违反 antd 规范

**位置**: 第 70-86 行
```tsx
<Form.Item label="画像">
  <Segmented ... />
  <Form.Item name="portrait" style={{ marginBottom: 0 }}>
    ...
  </Form.Item>
</Form.Item>
```
**问题**: antd `Form.Item` 嵌套在非 `Form.List` 场景下是不规范用法。外层 `Form.Item` 没有 `name`，仅作布局容器用，但这会导致：
1. 表单验证时内层 `Form.Item` 的校验规则可能不被正确触发
2. `Segmented` 切换时通过 `form.setFieldValue('portrait', undefined)` 手动清空，而非使用表单联动机制
3. antd 的 `Form.Item` 不应作为纯布局容器
**修复建议**: 使用普通的 `<div>` 或 antd `<Space direction="vertical">` 替代外层 `Form.Item`。

### H-4: 模式切换时未清除相关字段值

**位置**: 第 54 行（`writeMode === 'manual'`）和第 69 行（`writeMode === 'ai'`）
**问题**: 当用户在 AI 模式下填写了 portrait/skills/llm_model_id 后切换到 manual 模式，这些字段的值仍残留在表单中（只是被条件渲染隐藏）。如果表单提交时未做额外清理，这些不可见的值会随表单一起提交，导致后端数据不一致。
**修复建议**: 在 `writeModeChange` 回调中或 `onSave` 提交前，根据当前模式清理无关字段：
```tsx
const handleModeChange = (mode: WriteMode) => {
  writeModeChange(mode);
  if (mode === 'manual') {
    form.setFieldsValue({ portrait: undefined, skills: undefined, llm_model_id: undefined });
  } else {
    form.setFieldsValue({ title: undefined });
  }
};
```

### H-5: `onSave` 无二次提交防护

**位置**: 第 43 行 `<Form form={form} onFinish={onSave}>`
**问题**: `saving` 状态已通过 props 传入，但 `<Button>` 提交按钮不在本组件内（推测在父组件中）。若父组件未正确使用 `saving` 禁用按钮，用户可快速双击触发多次提交。本组件无法自行防护。
**修复建议**: 在 `Form.onFinish` 中添加防护：
```tsx
const handleFinish = (values: ArticleFormValues) => {
  if (saving) return;
  onSave(values);
};
```
或将 `disabled={saving}` 属性添加到可能的触发元素上。

---

## M — MEDIUM（6 项）

### M-1: 第 57 行超长 JSX 表达式可读性差

**位置**: 第 55-61 行
**问题**: `label` 属性包含一个完整的 `<Upload>` + `<Button>` 组件链，单行 280+ 字符，严重影响可读性和维护性。
**修复建议**: 将导入按钮抽取为独立变量：
```tsx
const titleLabel = (
  <Space size={8}>
    <span>标题</span>
    <Upload accept=".md,.doc,.docx" showUploadList={false} beforeUpload={...}>
      <Button type="link" size="small" icon={<ImportOutlined />}>导入</Button>
    </Upload>
  </Space>
);
```

### M-2: `App` 导入未使用

**位置**: 第 4 行
```tsx
import { ..., App } from 'antd';
```
**问题**: `App` 组件被导入但在组件中未使用（B-2 修复时可能需要 `App.useApp()` 获取 `message` 实例，但当前未使用）。
**修复建议**: 移除未使用的 `App` 导入，或在 B-2 修复中使用 `const { message } = App.useApp()`。

### M-3: `portraitMode` 切换时未校验 portrait 值合法性

**位置**: 第 77 行
```tsx
onChange={(val) => { setPortraitMode(val as 'input' | 'select'); form.setFieldValue('portrait', undefined); }}
```
**问题**: 虽然清空了 portrait 值，但如果 portrait 字段有 `required` 校验规则（当前没有但可能未来添加），此处应使用 `form.setFieldsValue` 并触发重新校验。
**修复建议**: 使用 `form.resetFields(['portrait'])` 替代手动 `setFieldValue`，确保校验状态同步清除。

### M-4: 条件渲染的表单字段缺少过渡动画

**位置**: 第 54 行、第 69 行
**问题**: `writeMode` 切换时，manual 和 ai 模式的字段直接出现/消失，没有过渡动画，用户体验突兀。
**修复建议**: 使用 CSS transition 或 antd `<Collapse>` / CSS `max-height` 过渡。

### M-5: 表单未设置 `requiredMark` 配置

**位置**: 第 43 行
```tsx
<Form form={form} onFinish={onSave} layout="vertical" initialValues={{ write_mode: 'ai' }}>
```
**问题**: 根据 IBM Carbon Design System，必填字段标记应清晰一致。当前表单的 `required` 字段（write_mode、title、article_type、keywords）分散在不同条件分支中，用户可能不清楚哪些字段是必填的。
**修复建议**: 考虑在 Form 上设置 `requiredMark` 或在每个必填项的 label 中明确标注。

### M-6: 缺少 `aria-label` 无障碍属性

**位置**: 多处
**问题**: Segmented 控件（第 72 行）和 Upload 按钮（第 57 行）缺少 `aria-label`，屏幕阅读器无法正确识别其功能。
**修复建议**: 为关键交互元素添加 `aria-label`：
```tsx
<Upload accept="..." aria-label="导入文档">
<Button ... aria-label="导入文档到标题">导入</Button>
```

---

## L — LOW（3 项）

### L-1: `React.memo` 浅比较可能不足

**位置**: 第 108 行
```tsx
export default React.memo(ArticleSettingsForm);
```
**问题**: Props 中包含 `kbKeywords`、`kbPortraits`、`kbImages`、`skillsOptions`、`llmModelsOptions` 等数组/对象，若父组件每次渲染都创建新引用，`React.memo` 将失效。
**修复建议**: 父组件应使用 `useMemo` 缓存这些选项，或此处改用自定义比较函数。

### L-2: `initialValues` 硬编码与 props `writeMode` 可能冲突

**位置**: 第 43 行
```tsx
initialValues={{ write_mode: 'ai' }}
```
**问题**: `initialValues` 写死为 `'ai'`，但 `writeMode` 是受控 prop。如果父组件传入的 `writeMode` 初始值与 `'ai'` 不同，会出现状态不同步。
**修复建议**: 从 props 获取初始值，或确保 `initialValues` 与父组件状态一致。

### L-3: 缺少组件 `displayName`

**位置**: 第 108 行
**问题**: `React.memo` 包裹的组件在 React DevTools 中不显示 `displayName`，调试困难。
**修复建议**:
```tsx
ArticleSettingsForm.displayName = 'ArticleSettingsForm';
export default React.memo(ArticleSettingsForm);
```

---

## 评审维度总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | 6/10 | 核心功能齐全，但 skills 多选/导入校验有缺陷 |
| 类型安全 | 5/10 | skills/keywords 类型与控件不匹配 |
| 可维护性 | 6/10 | 结构清晰但超长 JSX 和嵌套 Form.Item 增加维护负担 |
| 可测试性 | 2/10 | 零测试覆盖 |
| 无障碍 | 3/10 | 缺少 aria-label，控件未标注 |
| DESIGN.md 合规 | 6/10 | 使用 antd 组件但未完全遵循 IBM Carbon Token |
| 防御性编程 | 4/10 | 缺少导入校验、模式切换残留、无二次提交防护 |

---

## 修复优先级路线图

| 优先级 | 问题 | 预估工时 |
|--------|------|----------|
| P0 | B-1: 创建测试文件（≥ 15 测试用例） | 2h |
| P0 | B-2: onImportDocument 文件校验 | 30min |
| P1 | H-1: skills 添加 mode="multiple" | 10min |
| P1 | H-3: Form.Item 嵌套改为 div/Space | 20min |
| P1 | H-4: 模式切换清除字段 | 20min |
| P1 | H-5: 二次提交防护 | 15min |
| P2 | M-1~M-6: 可读性+无障碍+未使用导入 | 30min |
| P2 | L-1~L-3: memo 比较+displayName+initialValues | 15min |

**总预估工时**: ~4h
**修复后预期评分**: 7.5/10
