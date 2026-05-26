# ArticleImageManager.tsx 安全评审

**文件**: `pages/article/components/ArticleImageManager.tsx`
**评审类型**: 代码安全评审
**评审日期**: 2026-05-26
**评审者**: Claude Code (安全专家模式)

---

## 综合评分: 5.8/10 — CONDITIONAL APPROVE

该组件在服务器端上传链路有较完善的防护（MIME校验+文件签名+尺寸验证+JWT认证），但前端侧存在无数量上限DoS、闭包陈旧数据丢失、URL校验不充分等安全问题。修复3项HIGH后预期可达7.5/10。

---

## 评审维度总览

| 维度 | 评分 | 状态 |
|------|------|------|
| 输入校验 | 5.0/10 | 需改进 |
| 上传安全 | 6.5/10 | 可接受 |
| XSS/注入防护 | 7.5/10 | 良好 |
| 访问控制 | 6.0/10 | 可接受 |
| 数据完整性 | 4.0/10 | 需改进 |
| 错误处理 | 6.0/10 | 可接受 |

---

## 正向安全特性（已做好的）

1. **服务器端上传链路防护完备**: `upload.controller.ts` 实现了 MIME校验 + 文件签名验证(`verifyFileSignature`) + 图片尺寸限制(8000x8000) + JWT认证 + 角色授权(sysadmin/admin) + 文件清理(`safeCleanup`) — 5层纵深防御
2. **URL协议白名单**: `handleAddUrl` 使用 `new URL()` 解析并限制仅 http/https 协议，有效阻断 `javascript:`、`data:`、`file:` 等危险协议
3. **React XSS防护**: 所有动态内容通过 JSX 渲染，无 `dangerouslySetInnerHTML`，无直接 DOM 操作
4. **JWT认证**: `apiClient` 通过 Authorization header 携带 JWT token，401响应自动清除凭证并重定向
5. **重复URL检测**: `handleAddUrl` 检查 `imageList.includes(url)` 防止重复添加
6. **知识库预览禁用**: KB图片设置 `preview={false}` 防止在弹窗中打开不受控的URL

---

## 安全问题清单

### HIGH (3项)

#### H1: 无图片数量上限 — 浏览器资源耗尽 DoS
- **位置**: `ArticleImageManagerProps.imageList` (prop), L9
- **问题**: `imageList` 数组无最大长度约束。攻击者可通过以下路径无限添加：
  1. URL模式：快速输入URL → `handleAddUrl` 无频率限制
  2. 上传模式：连续上传文件 → `handleUpload` 无数量检查
  3. 知识库模式：批量选择KB图片 → onClick无数量校验
- **影响**: DOM节点爆炸（每张图片 = 1个div + 1个Image + 可选1个overlay），内存持续增长，最终浏览器标签页崩溃
- **建议**:
  ```typescript
  const MAX_IMAGES = 20;
  // 在 handleAddUrl / handleUpload / kb onClick 中添加:
  if (imageList.length >= MAX_IMAGES) {
    message.warning(`最多只能添加 ${MAX_IMAGES} 张图片`);
    return;
  }
  ```

#### H2: handleUpload 闭包陈旧 — 并发上传数据丢失
- **位置**: L24-47, `useCallback` 依赖 `[imageList, imageListChange, message]`
- **问题**: `handleUpload` 在 `useCallback` 中捕获当前 `imageList` 快照。若用户快速连续上传两张图片：
  1. 上传A开始，闭包捕获 `imageList = []`
  2. 上传B开始，闭包捕获 `imageList = []`（A尚未完成，React未重渲染）
  3. 上传A完成：`imageListChange([...[], urlA])` → `['urlA']`
  4. 上传B完成：`imageListChange([...[], urlB])` → `['urlB']` — **urlA丢失**
- **影响**: 用户上传的图片静默丢失，且已上传到服务器的文件成为孤立文件（占磁盘空间、无关联记录）
- **建议**: 使用函数式更新或 ref 持有最新 imageList
  ```typescript
  const imageListRef = useRef(imageList);
  imageListRef.current = imageList;
  // 在 handleUpload 中:
  imageListChange([...imageListRef.current, res.data.data.url]);
  ```

#### H3: getApiErrorMessage 对 4xx 错误暴露服务端原始消息
- **位置**: L42 + `pages/utils/error.ts` L6
- **问题**: `getApiErrorMessage` 仅对 5xx 错误使用 fallback 并 `console.error`，对 4xx 错误直接返回 `resp.data.message`。服务端 4xx 响应可能包含：
  - 内部文件路径（如 multer 配置错误）
  - 数据库约束信息（如字段名、唯一键冲突）
  - 堆栈信息片段（未正确序列化的 Error 对象）
- **影响**: 攻击者通过构造恶意请求触发 4xx 错误，收集服务端内部信息用于后续攻击
- **建议**: 对所有非预期错误消息进行脱敏，或服务端统一使用用户友好消息
  ```typescript
  // error.ts 中添加白名单
  const SAFE_MESSAGES = new Set(['不支持的图片格式', '请选择要上传的图片', ...]);
  if (resp?.status >= 500) return fallback;
  if (resp?.data?.message && SAFE_MESSAGES.has(resp.data.message)) return resp.data.message;
  return fallback;
  ```

### MEDIUM (5项)

#### M1: URL添加无内容类型校验 — 伪造图片加载
- **位置**: L49-65, `handleAddUrl`
- **问题**: 仅校验 URL 格式和协议，不验证 URL 实际返回的内容类型。攻击者可添加指向非图片资源的 URL（如 HTML页面、PDF、可执行文件），由 `<Image>` 组件尝试加载，可能触发浏览器混合内容警告或加载异常
- **影响**: 功能异常 + 潜在的混合内容安全问题
- **建议**: 添加图片扩展名白名单校验（`.jpg/.jpeg/.png/.gif/.webp/.svg`），或在上传后通过 `<img onload/onerror>` 验证

#### M2: 图片删除无确认 — 误操作数据丢失
- **位置**: L173, `onClick={() => imageListChange(imageList.filter(...))}`
- **问题**: 点击删除按钮立即从列表移除图片，无任何确认机制。若图片来自上传，已上传到服务器的文件无法恢复（删除操作仅移除URL引用，不删除文件）
- **影响**: 用户误点击导致图片引用丢失，且已上传文件成为孤立资源
- **建议**: 使用 `antd Popconfirm` 组件包裹删除按钮
  ```tsx
  <Popconfirm title="确定删除此图片？" onConfirm={() => imageListChange(...)}>
    <div role="button" ...>
  ```

#### M3: handleAddUrl / KB选择无防抖 — 快速操作放大DoS
- **位置**: L49-65 (handleAddUrl), L109-115 (KB onClick)
- **问题**: `handleAddUrl` 和 KB 图片选择点击均无防抖。配合 H1（无数量上限），攻击者可通过以下方式快速填充列表：
  1. URL模式：粘贴URL → 连续按回车，每次都创建新数组+触发父组件重渲染
  2. KB模式：快速连续点击不同图片，每次触发 `imageListChange([...imageList, url])` — 大数组频繁拷贝
- **影响**: 与 H1 叠加，加速 DoS 效果
- **建议**: 对 `handleAddUrl` 添加防抖（300ms），或至少在操作中检查 `imageList.length`

#### M4: kbImages.image_url 未校验 — 跨域资源加载风险
- **位置**: L102, L133, `img.image_url` 直接用作 `<Image src>`
- **问题**: `kbImages` 通过 props 传入，组件内部未对 `image_url` 做任何校验（协议、格式、内容类型）。若知识库数据被污染（SQL注入、管理后台XSS等），恶意URL可被直接渲染
- **影响**: 恶意图片URL可被用于追踪用户（pixel tracking）或加载外部资源
- **建议**: 在渲染前校验 `image_url` 协议为 https:
  ```typescript
  const safeUrl = img.image_url.startsWith('https://') ? img.image_url : '';
  ```

#### M5: 上传中状态保护不完整 — 潜在竞态
- **位置**: L33-46, `setUploading(true/false)` + L153 `disabled={uploading}`
- **问题**: `uploading` 状态仅在 Upload 组件的 `disabled` 属性上使用，但 `handleUpload` 是异步函数。若用户在网络慢时快速操作：
  1. 第一次上传开始，`uploading=true`
  2. Upload 组件被 disabled
  3. 第一次上传完成前，用户切换到URL模式添加图片
  4. 切回上传模式，此时 `uploading` 仍为 true（正常）
  5. 但若 Promise 被 reject 且 catch 块中 `setUploading(false)` 执行后，第二个并发上传仍在进行
- **影响**: 理论上的竞态条件，实际触发概率低
- **建议**: 使用上传计数器或 AbortController 管理并发上传

### LOW (3项)

#### L1: 硬编码魔术数字 — 维护性与一致性风险
- **位置**: L29 (`10 * 1024 * 1024`), L73/127/167 (`width: 80, height: 80`), L175 (`width: 20, height: 20`)
- **问题**: 文件大小限制 10MB 硬编码在前端，与后端 `config.upload.imageMaxSize` 无关联。若后端配置变更（如改为 5MB），前端仍允许选择 10MB 文件，用户体验差且可能产生不必要的网络请求
- **建议**: 从配置API或环境变量获取限制值

#### L2: 事件处理器无防连击保护
- **位置**: L109-115 (KB onClick), L116-125 (KB onKeyDown)
- **问题**: onClick 和 onKeyDown 可被快速连续触发（键盘按住空格不放），每次都触发 `imageListChange`
- **建议**: 添加防抖或在回调中检查当前选中状态

#### L3: 无上传进度反馈 — 用户无法判断大文件上传状态
- **位置**: L24-47, `handleUpload`
- **问题**: 上传期间仅显示 "上传中..." 文案，无进度条。对于接近 10MB 的大文件，用户可能误以为卡死而重复操作
- **建议**: 使用 antd Upload 的进度回调或 `axios onUploadProgress` 显示上传进度

---

## 安全上下文分析

### 上传链路安全评估

| 层级 | 防护措施 | 有效性 |
|------|----------|--------|
| 前端文件类型 | `file.type.startsWith('image/')` | 低（MIME可伪造） |
| 前端大小限制 | `10MB` 硬编码 | 中（可被绕过） |
| 传输认证 | JWT Bearer Token | 高 |
| 服务器MIME校验 | `ImageValidator.validateMime` | 高 |
| 服务器签名验证 | `verifyFileSignature` | 高（检测MIME伪造） |
| 服务器尺寸限制 | 8000x8000 像素 | 高（防图片炸弹） |
| 服务器角色控制 | sysadmin/admin | 高 |
| 服务器文件清理 | `safeCleanup` | 高（异常时清理临时文件） |

**结论**: 上传链路的服务器端防护达到生产级水平。前端校验仅为用户体验优化，不能作为安全边界。

### 认证与授权

- **传输认证**: apiClient 通过 `localStorage.getItem('token')` 获取 JWT，设置 `Authorization: Bearer` header
- **授权**: 组件通过 `editable` prop 控制操作权限，实际权限由父组件和路由守卫决定
- **401处理**: 响应拦截器自动清除 token 并重定向到 `/login`
- **风险**: `editable` 为 prop 而非鉴权结果，若父组件传递逻辑有误，非授权用户可能获得编辑能力

### XSS 风险评估

- **React JSX**: 所有动态内容通过 JSX 渲染，自动转义
- **Image src**: 使用 antd `<Image src={url}>`，React 对 src 属性不做特殊转义，但 `<img>` 标签的 src 不执行 JavaScript（配合 H2 的协议白名单已阻断 `javascript:` 协议）
- **无 innerHTML/dangerouslySetInnerHTML**: 安全
- **URL参数**: `handleAddUrl` 中 `new URL(url)` 会解析 URL，但不将参数注入 DOM

---

## 修复优先级

| 优先级 | 编号 | 修复内容 | 预估工时 |
|--------|------|----------|----------|
| P0 | H1 | 添加图片数量上限 MAX_IMAGES=20 | 0.5h |
| P0 | H2 | 使用 ref 消除闭包陈旧问题 | 0.5h |
| P1 | H3 | getApiErrorMessage 4xx 消息白名单 | 1h |
| P1 | M2 | 删除操作添加 Popconfirm | 0.5h |
| P2 | M1 | URL 添加扩展名校验 | 0.5h |
| P2 | M3 | handleAddUrl 添加防抖 | 0.5h |
| P2 | M4 | kbImages image_url 协议校验 | 0.5h |
| P3 | L1-L3 | 提取常量 + 事件防抖 + 上传进度 | 1.5h |

**总计预估**: 5.5h（P0: 1h, P1: 1.5h, P2: 1.5h, P3: 1.5h）

---

## 修复后预期评分: 7.5/10

修复 H1 + H2 + H3 后，主要安全风险消除：
- DoS 攻击面收窄（数量上限 + 防抖）
- 数据完整性保障（ref 消除闭包问题）
- 信息泄露风险降低（错误消息脱敏）

剩余 M1-M5 为纵深防御加固项，不影响核心安全态势。
