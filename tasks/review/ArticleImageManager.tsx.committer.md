# pages/article/components/ArticleImageManager.tsx — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/article/components/ArticleImageManager.tsx` (187行) |
| **评审类型** | Code Committer 综合审核（安全+架构+质量+UI 四维交叉裁定） |
| **综合评分** | **5.6 / 10** |
| **裁决** | **⚠️ CONDITIONAL APPROVE** |
| **评审日期** | 2026-05-26 |

---

## 四维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 安全 | 5.8/10 | CONDITIONAL APPROVE | `.claude/.../article-image-manager-security-review.md` |
| 架构 | 5.4/10 | CONDITIONAL APPROVE | `.claude/.../article-image-manager-arch-review.md` |
| 质量 | 6.8/10 | CONDITIONAL APPROVE | `.claude/.../article-image-manager-quality-review.md` |
| UI | 4.5/10 | CONDITIONAL APPROVE | `tasks/review/ArticleImageManager.tsx.ui.md` |

---

## 阻断项（BLOCKING）— 合并前必须修复

### B-1. 无图片数量上限 → 内存/渲染 DoS [安全 H1 + 质量 M5]

- **严重程度**: CRITICAL
- **跨维确认**: 安全评审 H1 + 质量评审 M5 + 架构评审 M5
- **现状**: `imageList` 数组无最大长度限制，攻击者或误操作可无限添加图片 URL
- **影响**:
  - 前端：无限图片渲染导致 DOM 节点爆炸，页面卡死
  - 后端：若 imageList 持久化到数据库，单条记录可存储数百个 URL，查询性能下降
- **修复**:
  ```tsx
  const MAX_IMAGES = 20;
  const addImage = (url: string) => {
    if (imageList.length >= MAX_IMAGES) {
      message.warning(`最多添加 ${MAX_IMAGES} 张图片`);
      return;
    }
    imageListChange([...imageList, url]);
  };
  ```
- **阻断理由**: DoS 漏洞，安全阻断

### B-2. handleUpload/handleAddUrl 闭包陈旧 → 并发操作数据丢失 [安全 H2 + 架构 H3 + 质量 M1]

- **严重程度**: CRITICAL
- **跨维确认**: 三个维度独立发现同一问题
- **现状**:
  ```tsx
  // 行 40: handleUpload 闭包捕获 imageList 快照
  imageListChange([...imageList, res.data.data.url]);
  // 行 63: handleAddUrl 闭包捕获 imageList 快照
  imageListChange([...imageList, url]);
  ```
- **影响**: 快速连续操作（上传多张、添加多个 URL）时，后执行的操作会覆盖先执行的结果，因为两次调用都基于同一个旧 `imageList` 快照
- **修复**: 使用函数式更新模式
  ```tsx
  // 方案A：改 props 接口传递 setter
  imageListChange(prev => [...prev, url]);
  // 方案B：使用 ref 持有最新值
  const imageListRef = useRef(imageList);
  imageListRef.current = imageList;
  ```
- **阻断理由**: 数据丢失 bug，三个维度一致认定为最高优先级

### B-3. 37 处 inline style 违反 DESIGN.md + CLAUDE.md 铁律 [UI C1 + 质量 H1]

- **严重程度**: CRITICAL
- **跨维确认**: UI 评审 C1 + 质量评审 H1
- **现状**: 187 行代码中超过 80 行是 inline style，包含 5 处重复的 80×80 缩略图样式
- **违反**:
  - CLAUDE.md 铁律第 1 条："前端必须遵守 DESIGN.md"
  - CLAUDE.md 铁律第 2 条："所有页面样式必须遵循 DESIGN.md 定义的 IBM Carbon Design System 规范"
  - 项目其他组件（Sidebar、MarkdownViewer 等）已全部使用 CSS class
- **影响**: 主题不可切换、样式不可复用、代码可维护性极差、与项目规范严重不一致
- **修复**: 提取 CSS class 到 `global.css`
  ```css
  .image-thumb { width: 80px; height: 80px; border-radius: 0; overflow: hidden; }
  .image-thumb-selectable { cursor: pointer; border: 1px solid var(--color-hairline); transition: border-color 150ms; }
  .image-thumb-selectable:hover { border-color: var(--color-primary); background: var(--color-surface-1); }
  .image-thumb-selected { border: 1px solid var(--color-hairline); border-bottom: 2px solid var(--color-primary); }
  .image-overlay { position: absolute; inset: 0; background: var(--color-overlay-light, rgba(22,22,22,0.25)); display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .image-delete-btn { position: absolute; top: 0; right: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--color-overlay-medium, rgba(22,22,22,0.5)); }
  .image-upload-zone { border: 1px dashed var(--color-hairline); border-radius: 0; padding: 16px 0; text-align: center; cursor: pointer; color: var(--color-ink-subtle); display: flex; flex-direction: column; align-items: center; }
  .image-gallery-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .image-empty-text { color: var(--color-ink-subtle); }
  ```
- **阻断理由**: 项目铁律违规，且与全项目组件规范严重不一致

### B-4. 原生 `<span>` 替代 antd `Empty` 组件 — 违反 CLAUDE.md 铁律 [UI C2]

- **严重程度**: CRITICAL
- **现状**: 行 69 `<span style={{...}}>暂无插图</span>`
- **违反**: CLAUDE.md 铁律第 1 条明确要求使用 antd 组件
- **修复**: `<Empty description="暂无插图" image={Empty.PRESENTED_IMAGE_SIMPLE} />`
- **阻断理由**: 铁律违规，修复成本极低（1 行改动）

---

## 高优先级建议（HIGH）— 建议本迭代修复

### H-1. 删除无确认 → 破坏性操作无保护 [UI H6 + 安全 M2]

- **跨维确认**: UI 评审 H6 + 安全评审 M2
- **现状**: 点击删除按钮立即移除图片
- **修复**: 使用 antd `Popconfirm` 包裹删除操作
- **预估工时**: 15 min

### H-2. 删除按钮 20×20px 触控目标不足 [UI H1]

- **违反**: DESIGN.md 规定 48px minimum tap target，WCAG 2.1 SC 2.5.5 要求 44px
- **修复**: 扩展至 32×32px 可视 + 48×48px 点击区域，或使用 antd Button
- **预估工时**: 15 min

### H-3. 4xx 错误信息泄露 [安全 H3]

- **现状**: `getApiErrorMessage(err, '上传失败')` 对 4xx 响应暴露服务端原始错误消息
- **修复**: 对 4xx 响应仅显示 fallback 消息，不透传服务端信息
- **预估工时**: 10 min

### H-4. 零测试覆盖 [质量 B1]

- **现状**: 组件无任何测试文件
- **最低要求**:
  1. 上传文件类型校验（非图片拒绝）
  2. 文件大小校验（>10MB 拒绝）
  3. URL 协议校验（非 http/https 拒绝）
  4. URL 去重校验
  5. 知识库图片选择/取消
  6. 图片数量上限
- **预估工时**: 2.0 h

### H-5. Segmented size="small" 触控不足 [UI H2]

- **修复**: 移除 `size="small"`，使用默认尺寸
- **预估工时**: 1 min

### H-6. 上传区域 borderRadius: 2 违反 flat-square [UI H3]

- **修复**: 改为 `borderRadius: 0`（已在 B-3 CSS class 提取中包含）
- **预估工时**: 0 min（B-3 覆盖）

### H-7. 图片边框 2px 违反 hairline 规范 [UI H4]

- **修复**: 改为 1px + 底部 2px primary 下划线（已在 B-3 CSS class 提取中包含）
- **预估工时**: 0 min（B-3 覆盖）

---

## 中优先级建议（MEDIUM）— 可下迭代修复

| # | 问题 | 来源维度 | 修复建议 | 工时 |
|---|------|---------|---------|------|
| M-1 | 知识库图片无 hover 反馈 | UI M1 | CSS `:hover` 过渡效果 | 5 min |
| M-2 | 删除按钮无 Tooltip | UI M2 | antd `<Tooltip>` 包裹 | 5 min |
| M-3 | 加载态用 Spin 而非 Skeleton | UI M3 | `<Skeleton.Image>` 替代 | 15 min |
| M-4 | 覆盖层颜色硬编码 rgba | UI M4 | `global.css` 定义 `--color-overlay-*` | 5 min |
| M-5 | Image 缺少 alt 属性 | UI M5 | `alt={img.title}` / `alt={插图 ${idx+1}}` | 5 min |
| M-6 | 上传用手动 div 而非 Upload.Dragger | UI M6 | 替换为 `<Upload.Dragger>` | 15 min |
| M-7 | 已选列表无视觉分隔 | UI M8 | 添加 `<Divider />` | 5 min |
| M-8 | URL 无内容校验 | 安全 M1 | HEAD 请求验证 Content-Type | 30 min |
| M-9 | Props 命名 imageListChange | 架构 H4 | 重命名为 `onImageListChange` | 10 min |
| M-10 | 数组索引作 key | UI L1 + 质量 H4 | 使用 url 作 key | 5 min |

---

## 低优先级建议（LOW）— 可选

| # | 问题 | 来源 |
|---|------|------|
| L-1 | Input.Search enterButton 用 LinkOutlined 语义不当 | UI L6 → PlusOutlined |
| L-2 | InboxOutlined fontSize: 24 硬编码 | UI L2 |
| L-3 | 非编辑态无图片数量提示 | UI L3 |
| L-4 | memo 浅比较对 props 引用不稳定时失效 | 质量 M5 |
| L-5 | 重复 toggle 逻辑（选中/取消） | 质量 M4 |
| L-6 | 三模式未分解子组件 | 架构 H1（非阻断，组件仅 187 行） |

---

## 问题交叉分析

### 跨维度重复发现（高置信度）

| 问题 | 发现次数 | 维度 |
|------|---------|------|
| 闭包陈旧导致数据丢失 | 3 | 安全+架构+质量 |
| inline style 泛滥 | 2 | UI+质量 |
| 无图片数量上限 | 2 | 安全+架构 |
| 数组索引作 key | 2 | UI+质量 |
| 删除无确认 | 2 | UI+安全 |

### 安全纵深评估

```
┌──────────────────────────────────────────────────────────────────┐
│ 前端安全防御层                                                    │
├──────────┬───────────────────────────────┬──────────┬────────────┤
│ 层级      │ 机制                          │ 状态      │ 评级       │
├──────────┼───────────────────────────────┼──────────┼────────────┤
│ L1       │ MIME 类型校验 (image/*)        │ ✅ 已实现 │ 合格       │
│ L2       │ 文件大小限制 (10MB)            │ ✅ 已实现 │ 合格       │
│ L3       │ URL 协议白名单 (http/https)    │ ✅ 已实现 │ 合格       │
│ L4       │ URL 去重                       │ ✅ 已实现 │ 合格       │
│ L5       │ 数量上限                       │ ❌ 缺失   │ BLOCKING   │
│ L6       │ URL 内容校验 (Content-Type)    │ ❌ 缺失   │ MEDIUM     │
│ L7       │ 上传并发保护 (闭包陈旧)         │ ❌ 缺失   │ BLOCKING   │
│ L8       │ 删除操作确认                   │ ❌ 缺失   │ HIGH       │
└──────────┴───────────────────────────────┴──────────┴────────────┘
```

**前端安全覆盖率**: 4/8 层 = 50%
**后端安全**: 服务器端上传链路 5 层纵深防御完备（MIME+签名+尺寸+JWT+角色）

---

## 核心优点

1. **基础安全校验到位** — MIME 类型、文件大小、URL 协议白名单、URL 去重均已实现
2. **可访问性基础覆盖** — `role="checkbox"`, `aria-checked`, `aria-label`, `tabIndex`, `onKeyDown` (Enter/Space) 在知识库选择器上完整实现
3. **三模式设计合理** — 知识库选择/上传/URL 三种输入方式覆盖了主要使用场景
4. **选中态视觉清晰** — 勾选图标 + 半透明覆盖层提供明确的选中反馈
5. **React.memo 优化** — 使用 `React.memo` 避免不必要重渲染
6. **CSS 变量使用正确** — `var(--color-primary)`, `var(--color-hairline)` 等变量名与 DESIGN.md 对齐

---

## 最终裁决

### ⚠️ CONDITIONAL APPROVE — 有条件通过

**合并条件**: 必须修复全部 4 项 BLOCKING 后方可合并。

| 条件 | 修复项 | 预估工时 |
|------|--------|---------|
| B-1 | 图片数量上限 MAX_IMAGES=20 | 15 min |
| B-2 | 闭包陈旧改函数式更新 | 30 min |
| B-3 | 37 处 inline style 提取为 CSS class | 1.5 h |
| B-4 | 原生 span 改 antd Empty | 2 min |

**合计阻断项工时**: 约 2.0 h

### 评分预测

| 阶段 | 预期评分 |
|------|---------|
| 当前 | 5.6 / 10 |
| 修复 B-1 ~ B-4 后 | 7.0 / 10 |
| 修复 H-1 ~ H-7 后 | 7.8 / 10 |
| 全部修复后 | 8.5 / 10 |

### 与同类组件对比

| 组件 | Committer 评分 | 裁决 |
|------|---------------|------|
| MarkdownViewer.tsx | 7.6/10 | APPROVE |
| ArticleImageManager.tsx | 5.6/10 | CONDITIONAL APPROVE |
| KeywordDetail.tsx | 4.2/10 | REQUEST CHANGES |

本组件处于项目中间水平：安全基础优于 KeywordDetail，但样式架构和测试覆盖远逊于 MarkdownViewer。核心差距在于 inline style 泛滥和零测试。

---

## 审核签名

**审核人**: Code Committer 审核专家
**审核日期**: 2026-05-26
**代码版本**: dev 分支，commit 4adfd51
**下一步**: 修复 B-1 ~ B-4 后提交复审
