# ArticleImageManager.tsx — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 组件职责边界 | 5.5/10 | HIGH |
| 状态管理架构 | 6.0/10 | HIGH |
| Props 契约完备性 | 5.0/10 | HIGH |
| 组件可复用性 | 4.0/10 | HIGH |
| 跨组件一致性 | 7.0/10 | MEDIUM |
| 渲染性能架构 | 5.0/10 | HIGH |
| **综合** | **5.4/10** | **CONDITIONAL APPROVE** |

**结论：CONDITIONAL APPROVE** — 存在 4 项 HIGH 级别架构问题。组件作为图片管理聚合器的职责定义合理，但三模式实现未分解子组件、知识库领域概念泄漏到通用组件、useCallback 闭包陈旧风险、Props 命名违反 React 约定。修复 4 项 HIGH 后预期可达 7.5/10。

---

## HIGH-1 — 三模式逻辑未分解，单组件承担过多渲染职责

**位置**：`ArticleImageManager.tsx` L81-183（102 行渲染体）

组件在 `editable` 模式下渲染三种独立子视图（知识库选择 L91-149、上传 L151-159、URL 输入 L161-162），加上底部已选图片列表（L164-181），全部内联在一个 `<>...</>` Fragment 中。

当前结构（简化）：

```
ArticleImageManager (188行)
├── 非编辑态预览 (L67-78)
└── 编辑态
    ├── Segmented 模式切换 (L84-89)
    ├── kb 模式 —— 知识库网格 (L91-149, 59行)
    ├── upload 模式 —— Upload 拖拽区 (L151-159, 9行)
    ├── url 模式 —— Input.Search (L161-162, 2行)
    └── 已选图片列表 (L164-181, 18行)
```

**问题**：

1. **kb 模式占 59 行**（含选中态覆盖层、键盘事件处理），逻辑密度远高于其他两个模式
2. **三种模式的事件处理模型不统一**：kb 用 `onClick/onKeyDown`，upload 用 `beforeUpload`，url 用 `onSearch`
3. **已选图片列表在两个地方渲染**：非编辑态（L67-78）和编辑态底部（L164-181），结构相似但代码独立，DRY 违反

**修复方案**：提取子组件，每个模式独立封装：

```tsx
// 拆分为三个子组件
<KbImagePicker images={kbImages} loading={kbLoading} selected={imageList} onSelect={handleChange} />
<UploadImagePicker uploading={uploading} onUpload={handleUpload} />
<UrlImagePicker onAdd={handleAddUrl} />

{/* 统一的已选图片列表组件 */}
<SelectedImageList images={imageList} editable={editable} onRemove={handleRemove} />
```

**影响**：降低单文件复杂度、每个子模式可独立测试、减少阅读认知负担。

---

## HIGH-2 — 知识库领域概念泄漏到通用组件，违反 DIP

**位置**：`ArticleImageManager.tsx` L8-14（Props 接口）、L91-149（kb 模式渲染）

Props 接口中的 `kbImages: KbImage[]` 和 `kbLoading: boolean` 是知识库模块的领域概念，直接泄漏到本应是通用图片管理器中：

```tsx
interface ArticleImageManagerProps {
  imageList: string[];
  imageListChange: (list: string[]) => void;
  editable: boolean;
  kbImages: KbImage[];    // ← 知识库专属类型
  kbLoading: boolean;      // ← 知识库专属状态
}
```

**依赖倒置违反链**：

```
ArticleImageManager (通用组件)
  → import type { KbImage } from '../types'  (L6)
  → 依赖知识库领域类型
  → 消费者 ArticleSettingsForm 必须传入 kbImages/kbLoading
```

实际消费者 `ArticleSettingsForm.tsx` L87-95 需要从 `useKnowledgeBase` hook 获取数据后透传：

```tsx
<ArticleImageManager
  imageList={imageList}
  imageListChange={imageListChange}
  editable={editable}
  kbImages={kbImages}       // ← 知识库数据透传
  kbLoading={kbLoading}     // ← 知识库状态透传
/>
```

**修复方案**：将 kb 模式改为可选的数据源插槽：

```tsx
interface ImageSource {
  key: string;
  label: string;
  render: (selected: string[], onSelect: (urls: string[]) => void) => React.ReactNode;
}

interface ArticleImageManagerProps {
  imageList: string[];
  onImageListChange: (list: string[]) => void;
  editable: boolean;
  sources?: ImageSource[];  // ← 可扩展的数据源插槽
}
```

知识库选择器由消费者组装后传入，组件本身不感知知识库领域。

---

## HIGH-3 — useCallback 闭包陈旧风险，deps 包含可变引用

**位置**：`ArticleImageManager.tsx` L24-47（handleUpload）、L49-65（handleAddUrl）

两个 `useCallback` 的依赖数组均包含 `imageList`，而 `imageList` 在每次图片增删时由父组件传入新数组引用：

```tsx
const handleUpload = useCallback(async (file: File) => {
  // ...
  imageListChange([...imageList, res.data.data.url]);  // ← 闭包捕获的 imageList
  // ...
}, [imageList, imageListChange, message]);  // ← imageList 每次变更新引用
```

**问题链**：

1. **imageList 变更 → handleUpload 重新创建 → 所有消费 handleUpload 的子组件重新渲染**
2. 如果 `imageListChange` 使用函数式更新（`prev => [...prev, url]`），则 `imageList` 不需要出现在 deps 中，handleUpload 可稳定引用
3. 当前写法在并发场景下有数据丢失风险：两次快速操作间 `imageList` 可能已变更但闭包仍持有旧值

**修复方案**：使用函数式回调避免闭包依赖：

```tsx
const handleUpload = useCallback(async (file: File) => {
  // ...
  imageListChange(prev => [...prev, res.data.data.url]);  // ← 函数式更新
  // ...
}, [imageListChange, message]);  // ← 移除 imageList 依赖
```

同理 `handleAddUrl`（L63）和 kb 选择（L111、L120）中的 `imageList` 引用也应改为函数式更新。

---

## HIGH-4 — Props 命名违反 React 约定，语义不清晰

**位置**：`ArticleImageManager.tsx` L10（imageListChange）

```tsx
interface ArticleImageManagerProps {
  imageList: string[];           // ← 状态 prop
  imageListChange: (list: string[]) => void;  // ← 回调 prop
  editable: boolean;
  kbImages: KbImage[];
  kbLoading: boolean;
}
```

**React 社区约定**：
- 状态 prop：`value` / `items` / `list`
- 回调 prop：`onChange` / `onItemsChange` / `onListChange`

`imageListChange` 混合了状态名和动词，不符合 `[状态] + [动作]` 的命名模式。与 antd 组件 API 风格也不一致（antd 使用 `value` + `onChange`）。

**修复方案**：

```tsx
interface ArticleImageManagerProps {
  value: string[];              // 或 imageList
  onChange: (list: string[]) => void;  // 或 onImageListChange
  editable: boolean;
  sources?: ImageSource[];
}
```

---

## MEDIUM-1 — 数组索引 key 反模式，可变列表中存在错位风险

**位置**：`ArticleImageManager.tsx` L72（非编辑态）、L166（编辑态）

```tsx
{imageList.map((url, idx) => (
  <div key={idx} ...>  // ← 数组索引作为 key
```

`imageList` 是可变数组（支持增删），使用索引作为 key 存在 React 协调错位风险：

1. 删除第 2 张图片时，第 3 张图片的 key 从 `2` 变为 `1`，React 认为是"修改"而非"移动"
2. 对于带状态的子组件（如 antd `Image` 的预览状态），可能导致内部状态错乱

**修复方案**：使用 URL 本身或组合键：

```tsx
<div key={`${idx}-${url}`} ...>
```

注意：URL 可能重复（虽有 L62 的去重检查，仅限 url 模式），需确保唯一性。

---

## MEDIUM-2 — 魔术数字散布全文件，缺乏语义化常量

**位置**：多处硬编码值

| 位置 | 值 | 含义 |
|------|-----|------|
| L29 | `10 * 1024 * 1024` | 文件大小上限 |
| L73, L103, L127, L167 | `80` | 缩略图宽高 |
| L175 | `20` | 删除按钮尺寸 |
| L177 | `12` | 删除图标字号 |
| L141 | `20` | 选中图标字号 |
| L155 | `24` | 上传图标字号 |

这些值与 DESIGN.md 中 Carbon Design System 的 spacing/sizing token 无对应关系，修改时需逐个搜索替换。

**修复方案**：提取为语义化常量：

```tsx
const THUMBNAIL_SIZE = 80;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DELETE_BTN_SIZE = 20;
```

---

## MEDIUM-3 — React.memo 浅比较失效，props 引用不稳定

**位置**：`ArticleImageManager.tsx` L187

```tsx
export default React.memo(ArticleImageManager);
```

`React.memo` 使用浅比较，但以下 props 每次渲染可能产生新引用：

1. `imageList: string[]` — 父组件 state 更新时新数组引用
2. `imageListChange: (list: string[]) => void` — 如果父组件未 useCallback 包裹
3. `kbImages: KbImage[]` — 知识库 hook 返回的数据

当 `imageList` 变更时，memo 必然失效（这是正确行为）。但如果 `imageListChange` 和 `kbImages` 也在父组件中每次创建新引用，则 memo 完全无效。

**修复方案**：消费者需确保稳定引用：

```tsx
// ArticleSettingsForm.tsx 中
const handleImageListChange = useCallback((list: string[]) => {
  setImageList(list);
}, []); // setImageList 是 useState 的 dispatch，引用稳定
```

---

## MEDIUM-4 — 上传逻辑直接耦合 apiClient，无法注入替换

**位置**：`ArticleImageManager.tsx` L37-38

```tsx
const res = await apiClient.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

组件直接 import 并使用 `apiClient`（L4），将上传 API 路径 `/upload` 硬编码在组件内部。这意味着：

1. 无法在其他 API 上下文中复用（如不同上传端点）
2. 单元测试必须 mock `apiClient` 模块
3. 如果上传逻辑需增加额外参数（如目录、分类），必须修改组件

**修复方案**：通过 props 注入上传函数：

```tsx
interface ArticleImageManagerProps {
  // ...
  onUpload?: (file: File) => Promise<string>;  // ← 返回 URL
}
```

---

## MEDIUM-5 — 无图片数量上限约束

**位置**：全组件，无 `maxImages` 相关逻辑

组件不限制 `imageList` 的最大长度。用户可以无限制添加图片，导致：

1. 渲染性能随图片数量线性下降
2. 提交到后端时可能超出接口限制
3. 视觉布局在大量图片时溢出

**修复方案**：增加 `maxImages` prop 和前置校验：

```tsx
interface ArticleImageManagerProps {
  maxImages?: number;  // 默认值如 20
}

// handleUpload / handleAddUrl / kb 选择前校验
if (imageList.length >= maxImages) {
  message.warning(`最多只能添加 ${maxImages} 张图片`);
  return;
}
```

---

## 架构优点

1. **受控组件模式** — `imageList` / `imageListChange` 遵循 React 受控组件模式，状态所有权在父组件
2. **ant Design 组件使用规范** — 正确使用 Upload、Image、Segmented、Input.Search、Spin，符合项目铁律
3. **useCallback 优化意识** — 虽然实现有闭包风险，但表明开发者有性能优化意识
4. **可访问性基础** — kb 图片项添加了 `role="checkbox"`、`aria-checked`、`aria-label`、`tabIndex`、`onKeyDown`
5. **URL 安全校验** — 使用 `new URL()` 解析 + 协议白名单（仅 http/https），防止 javascript: 协议注入

---

## 修复优先级与预估工时

| 优先级 | 编号 | 修复内容 | 预估 |
|--------|------|---------|------|
| P0 | H-3 | useCallback 函数式更新消除闭包陈旧 | 0.5h |
| P0 | H-4 | Props 命名改为 onImageListChange | 0.5h |
| P1 | H-1 | 三模式提取子组件 | 1.5h |
| P1 | H-2 | 知识库解耦为数据源插槽 | 1.5h |
| P2 | M-1 | 数组索引 key 改为稳定 key | 0.5h |
| P2 | M-2 | 魔术数字提取常量 | 0.5h |
| P2 | M-5 | 增加 maxImages 约束 | 0.5h |
| P3 | M-3 | 消费者端 memo 优化 | 0.5h |
| P3 | M-4 | 上传函数 props 注入 | 0.5h |

**总计预估**：6.0h，修复后预期评分 7.5/10。
