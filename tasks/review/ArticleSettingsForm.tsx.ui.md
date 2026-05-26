# ArticleSettingsForm.tsx — UI 专家评审报告

> **评审日期**: 2026-05-26
> **评审维度**: DESIGN.md 合规性 / antd 最佳实践 / UI/UX 规范 / 可访问性 / 交互一致性
> **评审结果**: **CONDITIONAL APPROVE 4.5/10**

---

## 一、总评

`ArticleSettingsForm.tsx` 作为文章设置的核心表单组件，承载了编写方式选择、标题导入、画像配置、插图管理、技能选择、模型选择等全部配置能力。组件功能完整，但在 **DESIGN.md 合规性、antd 用法规范、交互一致性和可访问性** 方面存在多项需修复的问题。

核心问题集中在：(1) 多处违反 Carbon Design System 的圆角、字体、色彩规范；(2) antd 反模式使用（Form.Item 嵌套、Upload 嵌入 label）；(3) 交互组件风格不统一（Radio.Group 与 Segmented 混用）；(4) 可访问性缺失。

---

## 二、DESIGN.md 合规性评审（权重 30%）

### D-H1 [HIGH] 全局缺少圆角覆盖 — 违反 `{rounded.none}` 0px 规范

**文件**: `ArticleSettingsForm.tsx` 全组件
**行号**: 41–105

DESIGN.md 明确规定：

> Use `{rounded.none}` 0px on every CTA, card, input, and container. The flat-square aesthetic is the brand.
> Don't round corners on buttons, cards, or inputs. Even 4px rounded corners break the Carbon look.

当前组件所有 antd 子组件（`Input`, `Select`, `Radio.Group`, `Segmented`, `Upload`, `Button`）均使用 antd 默认圆角（6px），未通过 CSS 覆盖为 0px。整张表单在视觉上呈现"圆角"而非 Carbon 的"方正"品牌特征。

**修复建议**: 在 `global.css` 中为 antd 表单组件全局设置 `border-radius: 0`，或在组件级别通过 `className` 覆盖。

### D-H2 [HIGH] 缺少 IBM Plex Sans 字体和字重控制

**行号**: 全组件

DESIGN.md 规定：

> IBM Plex Sans — light weight 300 for display sizes, 400/600 for body and emphasis
> `letter-spacing: 0.16px` on body is a Carbon precision detail.

组件中所有表单标签、占位文字、按钮文字均未显式指定 IBM Plex Sans 字体族、字重和字间距。依赖 antd 默认字体栈，在未全局覆盖的系统上会 fallback 到非品牌字体。

**修复建议**: 确认 `global.css` 是否已全局设置 `font-family: 'IBM Plex Sans'`，并为表单标签（label）补充 `font-weight: 600; letter-spacing: 0.16px` 以符合 Carbon body-emphasis 规范。

### D-M1 [MEDIUM] 输入框背景色未使用 `{colors.surface-1}` (#f4f4f4)

**行号**: 60, 67, 81, 83, 97, 100

DESIGN.md `text-input` 组件规定：

> Background `{colors.surface-1}` (#f4f4f4), rounded `{rounded.none}`, padding 11px 16px.

antd Input/Select 默认背景为纯白 `#ffffff`，未覆写为 Carbon 规范的浅灰 `#f4f4f4`。

### D-M2 [MEDIUM] 间距未遵循 4px 网格系统

**行号**: 73 (`marginBottom: 8`), 57 (`fontSize: 12`, `padding: 0`)

DESIGN.md 规定 base unit 为 4px。当前使用的内联间距值（如 `8`）本身符合 4px 倍数，但使用内联 style 而非 spacing token（`var(--spacing-xs)` 等），导致无法保证全站一致性。

### D-L1 [LOW] 缺少 focus 状态的下划线处理

DESIGN.md 规定输入框 focus 时应将底部 1px hairline 替换为 2px `#0f62fe` 下划线（Carbon 签名式 focus 处理）。antd 默认 focus 为 box-shadow 蓝色描边，与 Carbon 规范不一致。

---

## 三、antd 最佳实践评审（权重 25%）

### A-B1 [BLOCKING] Form.Item 嵌套反模式

**行号**: 70–86

```tsx
<Form.Item label="画像">          {/* 外层：无 name，作为布局容器 */}
  <Segmented ... />
  <Form.Item name="portrait" ...> {/* 内层：有 name */}
    {portraitMode === 'select' ? ... : ...}
  </Form.Item>
</Form.Item>
```

`Form.Item` 嵌套是 antd 反模式：
- 外层 `Form.Item` 无 `name`，仅用作布局容器，这不是 `Form.Item` 的设计意图
- 嵌套后内层 Form.Item 的 `marginBottom: 0` 覆盖了 antd 默认间距，破坏了表单的垂直节奏
- 在 antd v5/v6 中，`Form.Item` 嵌套可能导致表单校验的 `validateTrigger` 和 `shouldUpdate` 行为异常

**修复建议**: 外层使用 `<div>` + `<label>` 替代 `<Form.Item label="画像">`，或将 Segmented 移到 Form.Item 外部。

### A-H1 [HIGH] Upload 组件嵌入 Form.Item label

**行号**: 55–62

```tsx
<Form.Item
  name="title"
  label={
    <Space size={8}>
      <span>标题</span>
      <Upload ...>
        <Button type="link" ...>导入</Button>
      </Upload>
    </Space>
  }
  ...
>
```

将 `Upload` 嵌入 `Form.Item` 的 `label` 属性中存在以下问题：
- **可访问性**: label 区域的语义被破坏，屏幕阅读器可能将按钮作为标签的一部分读出
- **布局不稳定**: label 区域包含可点击元素，点击"导入"按钮时也可能触发表单项的 focus
- **antd 不推荐**: antd `Form.Item` 的 `label` 属性设计意图是纯文本或简单 ReactNode，不包含交互式组件

**修复建议**: 将"导入"按钮从 label 中拆出，作为 Form.Item 的 `extra` 或独立行放置。

### A-M1 [MEDIUM] `initialValues` 硬编码与父组件状态不同步风险

**行号**: 43

```tsx
<Form ... initialValues={{ write_mode: 'ai' }}>
```

父组件 `ArticleDetail.tsx` 也独立维护了 `useState<WriteMode>('ai')`。两处初始值通过字面量硬编码同步，如果一处修改而另一处遗漏，将导致 UI 与实际表单值不一致。

**修复建议**: 去掉 `Form` 的 `initialValues`，由父组件通过 `form.setFieldsValue()` 统一初始化，或通过 props 传入 initialValues。

### A-M2 [MEDIUM] `saving` prop 声明但未使用

**行号**: 16, 34

```tsx
saving: boolean;   // 接口声明
// ... 解构时包含 saving
// 但组件内从未引用 saving
```

`saving` 被声明为 prop 并在解构时获取，但整个组件体内没有使用它。保存按钮在父组件 `ArticleDetail.tsx` 中管理，此 prop 是无效代码。

**修复建议**: 从 Props 接口和组件中移除 `saving`。

---

## 四、UI/UX 交互设计评审（权重 25%）

### U-H1 [HIGH] Radio.Group 与 Segmented 混用 — 交互组件风格不一致

**行号**: 46–53 (Radio.Group) vs 71–78 (Segmented)

同一表单中存在两种视觉风格相似的切换组件：
- `write_mode` 使用 `Radio.Group` + `optionType="button"` + `buttonStyle="solid"`
- `portraitMode` 使用 `Segmented`

两者在语义上都是"二选一"切换器，但视觉呈现不同：
- `Radio.Group button` 有明确的选中背景色，视觉权重较高
- `Segmented 是滑块式切换，更轻量现代

在同一表单中混用会导致用户认知负担增加：用户需要理解为什么两种切换器看起来不同，是否意味着不同的交互行为？

**修复建议**: 统一使用 `Segmented`（更符合 antd v6 推荐）或统一使用 `Radio.Group button`，保持全表单一致。

### U-H2 [HIGH] writeMode 切换时 AI 专属字段残留值

**行号**: 54–102

当用户在 `ai` 模式下填写了 `portrait`、`skills`、`llm_model_id` 等字段后，切换到 `manual` 模式，这些字段被隐藏但值仍保留在表单中。再切回 `ai` 模式时，旧值仍然存在。

与 `portraitMode`（input/select）切换时主动调用 `form.setFieldValue('portrait', undefined)` 不同，`writeMode` 切换时没有任何清理逻辑。

这可能导致：
- 用户困惑："我明明已经选择了，为什么还有之前的值？"
- 如果后端对 `manual` 模式提交的数据中包含 AI 字段值，可能导致数据不一致

**修复建议**: 在 `writeMode` 切换时，清理对方模式的专属字段值（或至少给出确认提示）。

### U-H3 [HIGH] 标签内嵌导入按钮 — 视觉拥挤且点击目标小

**行号**: 55–62

标题标签区域同时包含"标题"文字和"导入"链接按钮，在紧凑的表单布局中显得拥挤。`Button type="link" size="small"` 的点击区域仅 12px 字高，远小于 DESIGN.md 规定的 48px 最小触摸目标。

```
标题 [导入]          ← 视觉上过于紧凑
[输入框...]
```

**修复建议**: 将"导入文档"作为独立按钮放置在输入框右侧（通过 `Input` 的 `addonAfter`）或作为 Form.Item 的 `extra` 区域。

### U-M1 [MEDIUM] 表单提交无视觉反馈

**行号**: 全组件

`Form` 的 `onFinish` 直接调用 `onSave`，没有任何提交中的视觉反馈：
- 无 loading 遮罩或 spinner
- 无按钮禁用状态
- `saving` prop 存在但未用于此目的

用户点击保存后，如果网络慢可能重复点击。

**修复建议**: 使用 `saving` prop 控制 Form 或关键按钮的 disabled/loading 状态。

### U-M2 [MEDIUM] placeholder 文案风格不统一

**行号**: 60, 64, 67, 81, 97, 100

| 字段 | placeholder | 风格 |
|------|-------------|------|
| 标题 | "请输入文章标题，或点击「导入」从文档自动填充" | 详细引导 |
| 文章类型 | "请选择文章类型" | 简洁 |
| 关键词 | "从知识库选择关键词" | 含来源前缀 |
| 画像-select | "从AI知识库选择画像" | 含来源前缀 |
| 画像-input | "输入画像描述" | 简洁 |
| 技能 | "选择关联技能" | 简洁 |
| 大模型 | "选择大模型" | 简洁 |

"从知识库选择"和"从AI知识库选择"的前缀风格不一致，且知识库不一定是"AI知识库"。

**修复建议**: 统一 placeholder 格式，如 "请选择XXX" 或 "选择XXX"，去掉来源前缀。

### U-M3 [MEDIUM] portraitMode 切换时 portrait 字段清空无用户确认

**行号**: 77

```tsx
onChange={(val) => {
  setPortraitMode(val as 'input' | 'select');
  form.setFieldValue('portrait', undefined);
}}
```

用户在 input 模式下可能已经输入了长段画像描述，切换到 select 模式时直接清空，无确认提示，可能造成用户输入丢失。

**修复建议**: 当 portrait 字段有值时，切换 portraitMode 前通过 `Modal.confirm` 或 `App.useApp().modal.confirm` 给出确认。

### U-M4 [MEDIUM] `keywords` Select 为单选但字段语义可能需要多选

**行号**: 66–68

```tsx
<Form.Item name="keywords" label="关键词" ...>
  <Select ... options={kbKeywords} />
</Form.Item>
```

字段名为"关键词"（复数语义），但 `Select` 未设置 `mode="multiple"`。后端数据类型为 `string | null`（单值），与字段名的复数语义矛盾。如果业务确实只需要单个关键词，字段名应改为"关键词"或改为多选。

### U-L1 [LOW] `article_type` 和 `keywords` 在两种模式下都显示但无视觉区分

**行号**: 63–68

`article_type` 和 `keywords` 是两种模式共享的字段，但它们被放在模式切换区域之外，没有任何视觉分组。用户可能不清楚哪些字段属于当前模式、哪些是共用的。

**修复建议**: 通过 `Divider` 或分组标题明确区分"公共字段"和"模式专属字段"。

### U-L2 [LOW] `llm_model_id` 必填但仅在 AI 模式显示 — 新用户可能不理解

**行号**: 99–101

`llm_model_id` 有 `required: true` 校验，但仅在 `writeMode === 'ai'` 时显示。如果用户切换模式时触发校验，可能看到不存在的字段的错误信息。

---

## 五、可访问性评审（权重 10%）

### X-H1 [HIGH] 缺少关键 ARIA 属性

**行号**: 全组件

- `Radio.Group`（write_mode）缺少 `aria-label` 或 `aria-labelledby`
- `Segmented`（portraitMode）缺少 `aria-label`
- 条件渲染的字段区域缺少 `role="group"` + `aria-label` 标注
- 错误 Alert 未添加 `role="alert"`（虽然 antd Alert 默认有 role="alert"）

**修复建议**: 为所有交互式组件组添加 `aria-label`，为条件渲染区域添加 `role="group"` + `aria-label`。

### X-M1 [MEDIUM] 导入按钮无独立键盘焦点路径

**行号**: 57

"导入"按钮嵌套在 label 内，键盘用户 Tab 导航时可能跳过此按钮，因为它不是表单字段的独立可聚焦元素。

### X-M2 [MEDIUM] 颜色对比度未验证

组件使用 antd 默认配色，部分 placeholder 文字（如 `#bfbfbf`）与白色背景的对比度可能低于 WCAG AA 标准（4.5:1）。DESIGN.md 的 `{colors.ink-subtle}` (#8c8c8c) 在白底上的对比度为 5.3:1，刚好达标。

---

## 六、代码结构评审（权重 10%）

### C-M1 [MEDIUM] 组件接收 17 个 Props — 接口过重

Props 列表：`form`, `isNew`, `editable`, `saving`(未使用), `error`, `writeMode`, `writeModeChange`, `imageList`, `imageListChange`, `onErrorClear`, `onSave`, `onImportDocument`, `kbKeywords`, `kbPortraits`, `kbImages`, `kbLoading`, `skillsOptions`, `llmModelsOptions`

17 个 Props 意味着组件承担了过多职责。可考虑：
- 将 KB 相关 props 合并为单个 `kbData` 对象
- 将 image 相关 props 合并为 `imageConfig` 对象
- 移除未使用的 `saving`

### C-M2 [MEDIUM] 条件渲染逻辑直接在 JSX 中 — 可读性差

**行号**: 54, 69, 99

多层 `&&` 条件渲染嵌套在 JSX 中，使得组件的结构不够清晰。尤其是 AI 模式的字段区块（69–102）使用了 `<>` Fragment 但缺少注释分隔。

### C-L1 [LOW] 内联样式散落各处

**行号**: 57, 73, 83

多处使用 `style={{ ... }}` 内联样式（`padding: 0`, `height: 'auto'`, `fontSize: 12`, `marginBottom: 8`, `marginBottom: 0`, `minRows: 2`, `maxRows: 6`），应提取为 CSS class。

---

## 七、问题汇总

| 编号 | 严重度 | 类别 | 问题 |
|------|--------|------|------|
| A-B1 | BLOCKING | antd | Form.Item 嵌套反模式（画像区域） |
| D-H1 | HIGH | DESIGN | 全局缺少圆角覆盖 0px |
| D-H2 | HIGH | DESIGN | 缺少 IBM Plex Sans 字体/字重控制 |
| A-H1 | HIGH | antd | Upload 嵌入 Form.Item label |
| U-H1 | HIGH | UX | Radio.Group 与 Segmented 混用 |
| U-H2 | HIGH | UX | writeMode 切换时 AI 字段残留值 |
| U-H3 | HIGH | UX | 标签内嵌导入按钮 — 视觉拥挤 |
| X-H1 | HIGH | A11y | 缺少关键 ARIA 属性 |
| D-M1 | MEDIUM | DESIGN | 输入框背景色未用 #f4f4f4 |
| D-M2 | MEDIUM | DESIGN | 间距未使用 spacing token |
| A-M1 | MEDIUM | antd | initialValues 与父组件状态不同步 |
| A-M2 | MEDIUM | antd | saving prop 未使用 |
| U-M1 | MEDIUM | UX | 表单提交无视觉反馈 |
| U-M2 | MEDIUM | UX | placeholder 文案风格不统一 |
| U-M3 | MEDIUM | UX | portraitMode 切换无确认 |
| U-M4 | MEDIUM | UX | keywords 单选与复数语义矛盾 |
| X-M1 | MEDIUM | A11y | 导入按钮无独立键盘焦点 |
| X-M2 | MEDIUM | A11y | 颜色对比度未验证 |
| C-M1 | MEDIUM | Code | 17 个 Props 接口过重 |
| C-M2 | MEDIUM | Code | 条件渲染逻辑可读性差 |
| D-L1 | LOW | DESIGN | focus 状态下划线不符合 Carbon |
| U-L1 | LOW | UX | 公共字段与模式字段无视觉分组 |
| U-L2 | LOW | UX | llm_model_id 必填校验时机问题 |
| C-L1 | LOW | Code | 内联样式散落 |

---

## 八、修复优先级建议

### P0 — 必须立即修复
1. **A-B1**: 消除 Form.Item 嵌套，改用 `<div>` + label
2. **A-H1**: 将 Upload 从 label 中拆出

### P1 — 应尽快修复
3. **D-H1**: 全局覆盖 antd 组件圆角为 0px
4. **D-H2**: 确认/补充 IBM Plex Sans 字体控制
5. **U-H1**: 统一切换组件风格（Radio.Group 或 Segmented 二选一）
6. **U-H2**: writeMode 切换时清理 AI 专属字段值
7. **U-H3**: 重构导入按钮位置（移至 Input addonAfter 或 extra）
8. **X-H1**: 补充 ARIA 属性

### P2 — 建议修复
9. **A-M1**: 去掉 Form initialValues，由父组件统一管理
10. **A-M2**: 移除未使用的 saving prop
11. **D-M1**: 输入框背景色覆写为 #f4f4f4
12. **U-M1**: 使用 saving 控制提交反馈
13. **U-M2**: 统一 placeholder 文案
14. **U-M3**: portraitMode 切换添加确认
15. **C-M1**: 合并 Props 为分组对象

### P3 — 可选优化
16. **D-L1**: focus 下划线样式
17. **U-L1**: 公共/专属字段视觉分组
18. **C-L1**: 内联样式提取为 CSS class

---

## 九、评审结论

**评分**: 4.5/10 — **CONDITIONAL APPROVE**

组件功能完整，能正确渲染和使用，但在 DESIGN.md 合规性和 antd 规范方面存在系统性偏差。圆角、字体、间距等核心视觉要素均未按 Carbon Design System 实现。antd 反模式（Form.Item 嵌套、Upload in label）可能导致维护和可访问性问题。

**通过条件**: 修复 P0 的 2 项 BLOCKING + P1 的 5 项 HIGH 后可达到 APPROVE 标准。建议在修复 P0/P1 后重新评审。
