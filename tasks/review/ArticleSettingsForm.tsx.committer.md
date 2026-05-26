# pages/article/components/ArticleSettingsForm.tsx — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/article/components/ArticleSettingsForm.tsx` (109行) |
| **评审类型** | Code Committer 综合审核（安全+架构+质量+UI 四维交叉裁定） |
| **综合评分** | **4.8 / 10** |
| **裁决** | **REQUEST CHANGES** |
| **评审日期** | 2026-05-26 |

---

## 四维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 质量 | 5.2/10 | CONDITIONAL APPROVE | `tasks/review/ArticleSettingsForm.tsx.quality-review.md` |
| 架构 | 5.0/10 | REQUEST CHANGES | `tasks/review/ArticleSettingsForm.tsx.architecture.md` |
| 安全 | 5.5/10 | CONDITIONAL APPROVE | `tasks/review/ArticleSettingsForm.tsx.security.md` |
| UI | 4.5/10 | CONDITIONAL APPROVE | `tasks/review/ArticleSettingsForm.tsx.ui.md` |

---

## 阻断项（BLOCKING）— 合并前必须修复

### B-1. 17 Props 接口膨胀 — 违反接口隔离原则 [架构 B-1 + 质量 M1 + UI C-M1]

- **严重程度**: HIGH
- **跨维确认**: 架构评审 B-1（BLOCKING）+ UI 评审 C-M1 + 质量评审隐含
- **现状**:
  ```typescript
  interface ArticleSettingsFormProps {
    form: FormInstance;          // 表单控制
    isNew: boolean;              // UI 状态
    editable: boolean;           // 权限状态
    saving: boolean;             // 异步状态（未使用）
    error: string;               // 错误状态
    writeMode: WriteMode;        // UI 状态
    writeModeChange: (...) => void;  // 回调
    imageList: string[];         // 业务数据
    imageListChange: (...) => void;  // 回调
    onErrorClear: () => void;    // 回调
    onSave: (...) => void;       // 回调
    onImportDocument: (...) => void; // 回调
    kbKeywords: KbKeyword[];     // 知识库数据
    kbPortraits: KbPortrait[];   // 知识库数据
    kbImages: KbImage[];         // 知识库数据
    kbLoading: boolean;          // 知识库状态
    skillsOptions: SkillOption[];     // 技能数据
    llmModelsOptions: LlmModelOption[]; // 模型数据
  }
  ```
- **问题**: 17 个 Props 混合了 5 种不同职责的关注点（表单控制/UI 状态/业务数据/回调/加载状态），超过 7 个 Props 的合理阈值。直接后果：
  1. **组件不可复用** — 与 ArticleDetail 的 hooks 输出强绑定
  2. **测试成本极高** — 每个测试用例需构造 17 个参数的 mock
  3. **修改脆弱** — 任何新增字段都需在 Props 链路上穿透
- **修复**: 按关注点分组为聚合对象：
  ```typescript
  interface ArticleSettingsFormProps {
    form: FormInstance;
    config: { isNew: boolean; editable: boolean; saving: boolean;
              writeMode: WriteMode; onWriteModeChange: (mode: WriteMode) => void; };
    knowledgeBase: { keywords: KbKeyword[]; portraits: KbPortrait[];
                     images: KbImage[]; loading: boolean;
                     skillsOptions: SkillOption[]; llmModelsOptions: LlmModelOption[]; };
    images: { list: string[]; onChange: (list: string[]) => void; };
    callbacks: { onSave: (values: ArticleFormValues) => void;
                 onImportDocument: (file: File) => void; onErrorClear: () => void; };
    error: string;
  }
  ```
- **阻断理由**: 架构级问题，17 Props 使组件测试和重构均不可行，必须先收缩接口再补充测试

### B-2. writeMode 双向控制路径 — Form.Item 与受控 Prop 并存 [架构 B-2 + 安全 H-2 + UI U-H2]

- **严重程度**: HIGH
- **跨维确认**: 架构评审 B-2（BLOCKING）+ 安全评审 H-2 + UI 评审 U-H2
- **现状**: writeMode 存在三条控制路径：
  1. **Form 存储** — `Form.Item name="write_mode"` 绑定 form 实例
  2. **父组件 useState** — `useState<WriteMode>('ai')` + `writeModeChange` prop
  3. **Form initialValues** — 硬编码 `{ write_mode: 'ai' }`
- **风险**:
  - 编辑已有文章时，后端 `write_mode` 可能为 `'manual'`，但 `initialValues` 硬编码 `'ai'`，导致表单初始值与实际数据不一致
  - `form.getFieldsValue()` 取 Form 存储值，条件渲染基于 prop 值，两者可能不同步
  - 模式切换后另一模式的字段值残留在 Form store 中，提交时携带脏数据
- **修复**: 选择单一控制源。推荐方案 A：
  ```typescript
  // 使用 Form.useWatch 替代 prop
  const writeMode = Form.useWatch('write_mode', form) || 'ai';
  // 移除 writeMode/writeModeChange props
  ```
- **阻断理由**: 状态不一致是功能级 bug，可导致脏数据提交到后端

### B-3. 零测试覆盖 [质量 B-1 + 架构 M-5]

- **严重程度**: HIGH
- **跨维确认**: 质量评审 B-1（BLOCKING）+ 架构评审 M-5
- **现状**: 组件无任何测试文件
- **影响**: 8 个表单字段、2 种编写模式、2 种画像输入模式、文件导入、图片管理 — 全部没有自动化质量保障
- **最低测试覆盖要求**:
  1. 基础渲染（两种模式各渲染一次）
  2. writeMode 切换（ai↔manual）
  3. 表单校验（必填字段为空时阻止提交）
  4. 画像 portraitMode 切换
  5. 导入按钮回调触发
  6. 模式切换时字段清理验证
- **阻断理由**: 无测试的代码不可维护，后续任何修改都是盲改

### B-4. Form.Item 嵌套反模式 [架构 H-4 + 质量 H-3 + UI A-B1]

- **严重程度**: HIGH
- **跨维确认**: 架构评审 H-4 + 质量评审 H-3 + UI 评审 A-B1（BLOCKING）
- **现状**:
  ```tsx
  <Form.Item label="画像">              {/* 外层：无 name，纯布局 */}
    <Segmented ... />
    <Form.Item name="portrait" style={{ marginBottom: 0 }}>  {/* 内层 */}
      ...
    </Form.Item>
  </Form.Item>
  ```
- **问题**:
  1. 外层 Form.Item 无 name，将其当作布局容器 — 这不是 Form.Item 的设计意图
  2. 嵌套后内层 `marginBottom: 0` 是补丁式修复
  3. 可能干扰 antd 校验流程和字段路径计算
- **修复**: 外层改用 `<div>` + 自定义 label
- **阻断理由**: antd 官方不推荐的用法，在 antd v6 中行为可能异常

### B-5. 文件导入零 MIME 校验 + .md 无 sanitize [安全 H-1 + 质量 B-2]

- **严重程度**: HIGH
- **跨维确认**: 安全评审 H-1 + 质量评审 B-2
- **现状**:
  ```tsx
  beforeUpload={(file) => { onImportDocument(file); return false; }}
  ```
- **问题**: 三层安全缺陷叠加：
  1. 组件层零校验 — beforeUpload 直接传递 file，无格式/大小/类型检查
  2. accept 仅浏览器提示 — 可通过修改请求或拖拽绕过
  3. .md 路径无 sanitize — `file.text()` 读取原始内容不经 DOMPurify 处理
- **修复**: 组件层添加基础校验 + .md 路径添加 sanitize
- **阻断理由**: 安全漏洞，恶意内容可直接注入文章

---

## 高优先级建议（HIGH）— 建议本迭代修复

### H-1. Upload 组件嵌入 Form.Item label [架构 H-3 + UI A-H1 + UI U-H3 + UI X-M1]

- **跨维确认**: 架构评审 H-3 + UI 评审 A-H1 + U-H3 + X-M1
- **现状**: Upload + Button 组件链嵌入 Form.Item 的 label 属性中
- **问题**: 语义违规 + 可访问性破坏 + 280+ 字符单行可读性极差 + 5 个 inline style 补丁
- **修复**: 将导入按钮从 label 中抽出，放在 Form.Item 的 `extra` 属性或独立布局
- **预估工时**: 30 min

### H-2. skills Select 缺少 mode="multiple" — 类型不匹配 [质量 H-1 + 安全 M-4 + 架构 M-2]

- **跨维确认**: 质量评审 H-1 + 安全评审 M-4 + 架构评审 M-2
- **现状**: `ArticleFormValues.skills` 类型为 `number[]`，但 `<Select>` 无 `mode="multiple"`
- **影响**: 提交时 skills 值为单个 number 而非 number[]，后端类型不匹配
- **修复**: `<Select mode="multiple" ... />`
- **预估工时**: 5 min

### H-3. saving prop 未使用 — 无防重复提交 [质量 H-5 + 架构 H-5 + 安全 M-2 + UI U-M1]

- **跨维确认**: 四个维度均独立发现
- **现状**: `saving: boolean` 声明但组件内零引用
- **影响**: Form.onFinish 可通过 Enter 键触发，绕过父组件按钮的 disabled 状态
- **修复**:
  ```tsx
  <Form form={form} onFinish={(values) => { if (saving) return; onSave(values); }} ...>
  ```
- **预估工时**: 5 min

### H-4. portraitMode 本地状态与 Form 受控模式冲突 [架构 H-1]

- **现状**: 编辑已有文章时，portrait 值可能来自手动输入，但 portraitMode 默认为 'select'，Select 无法匹配现有值
- **修复**: 根据 portrait 初始值智能推断 portraitMode：
  ```typescript
  const inferPortraitMode = (val?: string, kbPortraits?: KbPortrait[]) =>
    val && kbPortraits?.some(p => p.value === val) ? 'select' : 'input';
  ```
- **预估工时**: 20 min

### H-5. Radio.Group 与 Segmented 混用 — 交互风格不一致 [UI U-H1]

- **现状**: writeMode 使用 Radio.Group button，portraitMode 使用 Segmented，语义相同但视觉不同
- **修复**: 统一使用 Segmented 或 Radio.Group
- **预估工时**: 15 min

### H-6. 缺少关键 ARIA 属性 [UI X-H1]

- **现状**: Radio.Group、Segmented 均缺少 aria-label
- **修复**: 补充 ARIA 属性
- **预估工时**: 10 min

### H-7. 圆角/字体未覆盖 DESIGN.md [UI D-H1 + D-H2]

- **现状**: 所有表单组件使用 antd 默认圆角 6px，未覆盖为 Carbon 规范的 0px
- **修复**: 在 global.css 中为 antd 表单组件全局设置 `border-radius: 0`
- **预估工时**: 30 min

---

## 中优先级建议（MEDIUM）— 可下迭代修复

| # | 问题 | 来源维度 | 修复建议 | 工时 |
|---|------|---------|---------|------|
| M-1 | React.memo 浅比较对函数 Props 无效 | 架构 M-1 + 质量 L-1 | 父组件 useCallback/useMemo 或移除 memo | 30 min |
| M-2 | keywords 单选与复数语义矛盾 | 质量 H-2 + UI U-M4 | 确认业务需求后统一 | 15 min |
| M-3 | 错误仅 Alert 展示无字段级定位 | 架构 M-3 | 使用 form.setFields 实现字段级错误 | 1 h |
| M-4 | disabled 仅 UI 限制无纵深防御 | 安全 M-1 | onFinish 内二次校验 editable | 15 min |
| M-5 | portraitMode 切换无确认直接清空 | UI U-M3 | 有值时 Modal.confirm 确认 | 15 min |
| M-6 | placeholder 文案风格不统一 | UI U-M2 | 统一为 "请选择XXX" 格式 | 10 min |
| M-7 | 缺少 loading 态与骨架屏 | 架构 M-4 | kbLoading 时禁用全部交互 | 30 min |
| M-8 | 条件渲染无过渡动画 | 质量 M-4 | CSS transition 或 Collapse 过渡 | 30 min |
| M-9 | 缺少 requiredMark 配置 | 质量 M-5 | Form 上设置 requiredMark | 5 min |
| M-10 | 输入框背景色未用 DESIGN.md 的 #f4f4f4 | UI D-M1 | 覆盖 antd token | 15 min |

---

## 低优先级建议（LOW）— 可选

| # | 问题 | 来源 |
|---|------|------|
| L-1 | App 导入未使用 | 质量 M-2 + 架构 L-1 |
| L-2 | initialValues 硬编码 'ai' 与父组件重复 | 架构 L-2 + UI A-M1 |
| L-3 | inline style 散布违反 DESIGN.md | 架构 L-3 + UI C-L1 |
| L-4 | 缺少组件 displayName | 质量 L-3 |
| L-5 | 公共字段与模式字段无视觉分组 | UI U-L1 |
| L-6 | llm_model_id 必填校验时机问题 | UI U-L2 |
| L-7 | focus 状态下划线不符合 Carbon | UI D-L1 |
| L-8 | 文件名未 sanitization | 安全 M-3 |

---

## 问题交叉分析

### 跨维度重复发现（高置信度）

| 问题 | 发现次数 | 维度 |
|------|---------|------|
| 模式切换残留字段值 | 4 | 架构+安全+UI+质量 |
| saving prop 未使用 | 4 | 质量+架构+安全+UI |
| Form.Item 嵌套反模式 | 3 | 架构+质量+UI |
| skills 类型不匹配 | 3 | 质量+安全+架构 |
| 导入按钮嵌 label | 3 | 架构+UI(3子项) |
| 17 Props 膨胀 | 3 | 架构+UI+质量 |
| React.memo 无效 | 2 | 架构+质量 |
| 零测试覆盖 | 2 | 质量+架构 |

### 安全纵深评估

```
┌──────────────────────────────────────────────────────────────────────┐
│ ArticleSettingsForm.tsx 安全防御层                                    │
├──────────┬───────────────────────────────────────┬────────┬──────────┤
│ 层级      │ 机制                                  │ 状态    │ 评级     │
├──────────┼───────────────────────────────────────┼────────┼──────────┤
│ L1       │ 文件扩展名限制 (accept)                │ ⚠ 弱   │ 仅浏览器 │
│ L2       │ 文件 MIME 校验                        │ ❌ 缺失 │ BLOCKING │
│ L3       │ 文件大小限制                          │ ❌ 缺失 │ BLOCKING │
│ L4       │ .md 内容 sanitize                    │ ❌ 缺失 │ BLOCKING │
│ L5       │ 表单输入 XSS 防护                     │ ✅ antd │ 合格     │
│ L6       │ 编辑权限控制 (disabled)               │ ⚠ 弱   │ 仅 UI 层 │
│ L7       │ 防重复提交 (saving)                   │ ❌ 缺失 │ HIGH     │
│ L8       │ 模式切换字段清理                      │ ❌ 缺失 │ HIGH     │
│ L9       │ 输入长度限制                          │ ❌ 缺失 │ LOW      │
└──────────┴───────────────────────────────────────┴────────┴──────────┘
```

**前端安全覆盖率**: 1/9 层完全有效 + 2/9 层弱保护 = **约 22%**

---

## 核心优点

1. **纯渲染组件结构清晰** — 组件内无复杂逻辑，状态由父组件管理，阅读成本低
2. **antd 组件全覆盖** — 全部使用 antd 组件（Form/Input/Select/Radio.Group/Upload/Segmented），符合项目铁律
3. **图片管理解耦合理** — ArticleImageManager 作为独立子组件，职责分离清晰
4. **disabled 统一控制** — 所有表单控件通过 `editable` prop 统一控制可编辑状态
5. **条件渲染策略合理** — manual/ai 两种模式的字段分离清晰
6. **React.memo 意识** — 虽然当前因函数 Props 引用不稳定而无效，但表明有性能优化意识

---

## 最终裁决

### REQUEST CHANGES — 要求修改后重新提交

**理由**: 5 项 BLOCKING 问题覆盖安全、架构、质量三个维度，其中 **writeMode 双向控制路径** 和 **零测试覆盖** 是功能性缺陷，**文件导入零校验** 是安全漏洞，**17 Props 膨胀** 和 **Form.Item 嵌套** 是架构级反模式。组件当前不具备合并条件。

### 修复路线图

| 阶段 | 修复项 | 预估工时 | 预期评分 |
|------|--------|---------|---------|
| 阶段一 | B-4 Form.Item 嵌套 + B-5 文件导入校验 + H-2 skills 多选 + H-3 saving 防护 | 1.5 h | 5.8 |
| 阶段二 | B-2 writeMode 单一控制源 + H-4 portraitMode 推断 + H-1 导入按钮重构 | 2 h | 6.5 |
| 阶段三 | B-1 Props 分组重构 + B-3 测试覆盖（≥15 用例） | 3.5 h | 7.5 |
| 阶段四 | H-5~H-7 UI/ARIA + M-1~M-10 中优先级项 | 3 h | 8.5 |

**总预估工时**: 约 10 h

### 与同类组件对比

| 组件 | Committer 评分 | 裁决 |
|------|---------------|------|
| MarkdownViewer.tsx | 7.6/10 | APPROVE |
| ArticleImageManager.tsx | 5.6/10 | CONDITIONAL APPROVE |
| **ArticleSettingsForm.tsx** | **4.8/10** | **REQUEST CHANGES** |
| KeywordDetail.tsx | 4.2/10 | REQUEST CHANGES |

本组件是 Article 模块中评分最低的核心组件之一。与 ArticleImageManager（5.6/10 CONDITIONAL APPROVE）相比，差距在于：(1) 架构维度存在 2 项 BLOCKING 而 ImageManager 仅有 HIGH；(2) 安全覆盖率为 22% 远低于 ImageManager 的 50%；(3) 零测试覆盖。核心差距在于 **Props 接口膨胀导致不可测试** 和 **writeMode 双向路径导致状态不一致**，这两个问题互为因果——17 Props 使测试成本极高，而缺乏测试使状态问题无法被发现。

---

## 审核签名

**审核人**: Code Committer 审核专家
**审核日期**: 2026-05-26
**代码版本**: dev 分支，commit 885d8ac
**下一步**: 按路线图阶段一~三修复后提交复审，预期可达 7.5/10 APPROVE
