# upload-document.controller.ts 代码安全专家评审报告

**审计文件**: `apis/controller/upload-document.controller.ts`
**关联文件**: `apis/utils/document-validator.ts`
**审计日期**: 2026-05-24
**审计角色**: 代码安全专家
**审计范围**: 文件上传安全全链路（路径穿越、类型验证绕过、拒绝服务、信息泄露、竞态条件、错误处理、Multer 配置、内容验证、速率限制）

---

## 一、审计概要

| 严重级别 | 数量 |
|----------|------|
| CRITICAL | 2 |
| HIGH     | 5 |
| MEDIUM   | 4 |
| LOW      | 3 |

整体架构采用**三层验证**（扩展名白名单 → magic bytes 检测 → 内容深度解析），设计思路合理，但存在若干关键安全隐患需立即修复。

---

## 二、安全架构评估

### 做得好的方面

1. **多层验证架构**: 扩展名白名单 → magic bytes → 内容深度解析，三层防御纵深设计正确
2. **文件名随机化**: `crypto.randomUUID()` 重命名文件，防止路径遍历和文件名冲突
3. **认证与授权**: 上传接口受 JWT + 角色中间件保护（`authMiddleware + roleMiddleware('sysadmin', 'admin')`）
4. **文件大小限制**: 30MB 上限合理
5. **错误清理**: 验证失败时删除已上传的文件，防止垃圾文件积累
6. **速率限制**: 全局速率限制 + 反爬虫中间件提供基础防护
7. **uploads 目录已加入 .gitignore**: 避免上传文件被意外提交到版本控制

### 需要改进的方面

1. XML 和 YAML 解析器需要显式配置安全选项
2. ZIP 文件处理缺乏内存安全防护
3. 静态文件服务缺乏访问控制
4. 缺少磁盘空间和配额管理

---

## 三、发现详情

### [CRITICAL-1] XML 外部实体注入（XXE）

**严重级别**: CRITICAL
**文件**: `apis/utils/document-validator.ts`，第 163-174 行

`fast-xml-parser` 的 `XMLParser` 默认已禁用外部实体，但代码**未显式设置安全选项**。如果库的默认行为在将来版本中发生变化，攻击者可以上传包含 XXE payload 的 XML 文件，读取服务器敏感文件或触发 SSRF 攻击。

**当前代码**:
```typescript
const parser = new XMLParser();
const result = parser.parse(text);
```

**修复建议**: 显式禁用外部实体和相关危险特性:
```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: false,
  processEntities: false,
  htmlEntities: false,
  NumberParsingOptions: { hex: false, leadingZeros: false },
});
```

---

### [CRITICAL-2] YAML 反序列化导致任意代码执行（RCE）

**严重级别**: CRITICAL
**文件**: `apis/utils/document-validator.ts`，第 150-161 行

`js-yaml` 的 `yaml.load()` 未指定 `schema` 参数时，默认使用 `DEFAULT_SCHEMA`，支持 `!!js/undefined`、`!!js/regexp`、`!!js/function` 等 JavaScript 特定类型。攻击者可上传包含恶意 payload 的 YAML 文件，在服务器上**执行任意 JavaScript 代码**。

**攻击向量示例**:
```yaml
exploit: !!js/function >
  function() { require('child_process').execSync('rm -rf /') }
```

**当前代码**:
```typescript
const result = yaml.load(text);
```

**修复建议**: 使用安全的 `JSON_SCHEMA`:
```typescript
const result = yaml.load(text, { schema: yaml.JSON_SCHEMA });
```

---

### [HIGH-1] 上传目录无磁盘配额限制 — 存储耗尽攻击

**严重级别**: HIGH
**文件**: `upload-document.controller.ts`

单个文件限制 30MB，但缺少以下防护:
- 无全局磁盘空间检查
- 无总文件数量限制
- 无每个用户/公司的上传配额

攻击者可通过反复上传 30MB 文件，快速耗尽服务器磁盘空间，导致整个应用瘫痪。

**修复建议**:
1. 上传前检查可用磁盘空间
2. 实现每个公司/用户的上传配额限制
3. 设置全局上传目录大小阈值
4. 添加定时清理策略（清理未被引用的上传文件）

---

### [HIGH-2] 路径穿越风险 — 扩展名来自用户输入

**严重级别**: HIGH
**文件**: `upload-document.controller.ts`，第 38 行

文件名由 `crypto.randomUUID()` 生成（安全），但扩展名直接取自 `file.originalname`。`path.extname('../../../malicious.docx')` 在 Node.js 中正确返回 `.docx`，不会包含路径分隔符，风险较低，但防御纵深仍需加强。

**修复建议**: 增加防御性校验:
```typescript
const ext = path.extname(file.originalname).toLowerCase();
if (ext.includes('/') || ext.includes('\\') || ext.includes('..')) {
  cb(new Error('非法文件扩展名'));
  return;
}
```

---

### [HIGH-3] TOCTOU 竞态条件

**严重级别**: HIGH
**文件**: `upload-document.controller.ts`，第 12-14 行和第 25-27 行

存在两处 TOCTOU（Time of Check to Time of Use）竞态条件:

1. **目录创建**: 模块加载时检查目录是否存在，`destination` 回调中再次检查，检查与创建之间存在窗口期
2. **错误清理**: `fs.existsSync` 检查后执行 `fs.unlinkSync`，另一个进程可能在此窗口内替换文件

**修复建议**:
```typescript
// 目录创建: 直接 mkdir，recursive 模式下已存在不报错
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 错误清理: 直接尝试 unlink，忽略错误
try { fs.unlinkSync(req.file.path); } catch {}
```

---

### [HIGH-4] ZIP 炸弹风险 — 内存耗尽攻击

**严重级别**: HIGH
**文件**: `apis/utils/document-validator.ts`，第 116-127 行

`AdmZip` 将整个 ZIP 文件加载到内存中。攻击者可构造 ZIP 炸弹：压缩后仅几 KB，解压后可达数 GB。30MB 的压缩包可解压出数百 GB 数据。

**修复建议**:
1. 限制解压后的总大小（例如最大 100MB）
2. 限制 ZIP 内文件数量（例如最多 1000 个条目）
3. 考虑使用流式解压库（如 `yauzl`）替代全量内存加载

---

### [HIGH-5] Markdown 验证过于宽松 — 任意文件可上传

**严重级别**: HIGH
**文件**: `apis/utils/document-validator.ts`，第 187-193 行

Markdown 验证逻辑几乎接受任何非空内容:

```typescript
case 'md': {
  const hasMarkdownPatterns = /(^#{1,6}\s)|(\*\*.*?\*\*)|(\[.*?\]\(.*?\))|(^[-*+]\s)|(^>\s)|(```)/m.test(text);
  if (hasMarkdownPatterns || text.length > 0) {
    return { valid: true, detectedType: 'md', error: null };
  }
```

条件 `text.length > 0` 意味着**任何非空文本文件**都可以通过 `.md` 扩展名上传，可被用于绕过验证上传恶意内容。

**修复建议**:
1. 移除 `text.length > 0` 兜底条件，仅接受包含 Markdown 语法的文件
2. 确保 `express.static` 对 `.md` 文件返回 `Content-Type: text/plain`

---

### [MEDIUM-1] 静态文件服务缺少访问控制

**严重级别**: MEDIUM
**文件**: `apis/app.ts`

上传的文件通过 `/uploads/` 路径公开访问，无需认证。虽然文件名使用 UUID 难以猜测，但:
- UUID 不是加密安全的随机数，理论上可被枚举
- 上传文件后 URL 返回给客户端，如果客户端日志泄露则文件可被访问

**修复建议**:
1. 在静态文件服务前添加认证中间件
2. 或使用签名 URL（带过期时间的 token）

---

### [MEDIUM-2] YAML JSON_SCHEMA 下仍支持 `!!js/regexp`

**严重级别**: MEDIUM
**文件**: `apis/utils/document-validator.ts`

即使使用 `JSON_SCHEMA`，`!!js/regexp` 类型仍然被支持，可能导致正则表达式拒绝服务（ReDoS）攻击。

**修复建议**: 使用 `FAILSAFE_SCHEMA` 或自定义 schema 禁用所有 `js/*` 类型。

---

### [MEDIUM-3] 错误信息泄露内部实现细节

**严重级别**: MEDIUM
**文件**: `upload-document.controller.ts`，第 49 行和第 88 行

直接将 `err.message` 返回给客户端，可能泄露文件系统路径、库内部错误等。

**修复建议**: 对外返回通用错误消息，将详细错误记录到日志:
```typescript
logger.error('文件上传处理失败', { error: msg, filename: req.file?.originalname });
fail(res, 500, '文件处理失败，请联系管理员');
```

---

### [MEDIUM-4] OLE2 文件类型仅依赖声明扩展名

**严重级别**: MEDIUM
**文件**: `apis/utils/document-validator.ts`，第 72-78 行

DOC、XLS、PPT 共享相同的 OLE2 magic bytes，无法通过内容区分。代码选择信任声明的扩展名，攻击者可将恶意文件声明为其他 OLE2 扩展名通过验证。

**修复建议**: 对 OLE2 文件进行更深入的格式检查（检查内部流结构），确保后续处理流程不依赖文件扩展名。

---

### [LOW-1] Multer fileFilter 仅校验扩展名，未校验 MIME type

**严重级别**: LOW
**文件**: `upload-document.controller.ts`，第 36-40 行

仅通过扩展名校验，未检查 `file.mimetype`，可能导致不必要的文件被完整上传后才被拒绝。

**修复建议**: 在 `fileFilter` 中同时校验 MIME type。

---

### [LOW-2] 缺少文件名长度限制

**严重级别**: LOW
**文件**: `upload-document.controller.ts`

`file.originalname` 未做长度限制，过长文件名可能导致日志膨胀。

**修复建议**:
```typescript
if (file.originalname.length > 255) {
  cb(new Error('文件名过长（最大 255 个字符）'));
  return;
}
```

---

### [LOW-3] 缺少上传操作的审计日志

**严重级别**: LOW
**文件**: `upload-document.controller.ts`

上传操作没有记录审计日志。文件上传属于高风险操作，应记录操作者、时间、文件信息、结果等。

**修复建议**: 添加结构化日志记录。

---

## 四、修复优先级建议

| 优先级 | 编号 | 问题 | 预计工作量 |
|--------|------|------|-----------|
| P0 | CRITICAL-2 | YAML RCE 漏洞 | 5 分钟 |
| P0 | CRITICAL-1 | XML XXE 防御 | 10 分钟 |
| P1 | HIGH-5 | Markdown 验证过松 | 15 分钟 |
| P1 | HIGH-4 | ZIP 炸弹防护 | 30 分钟 |
| P1 | HIGH-1 | 磁盘配额限制 | 1 小时 |
| P2 | HIGH-2 | 扩展名路径字符检查 | 5 分钟 |
| P2 | HIGH-3 | TOCTOU 竞态修复 | 10 分钟 |
| P2 | MEDIUM-1 | 静态文件访问控制 | 30 分钟 |
| P2 | MEDIUM-3 | 错误信息脱敏 | 15 分钟 |
| P3 | MEDIUM-2 | YAML schema 加固 | 5 分钟 |
| P3 | MEDIUM-4 | OLE2 深度检查 | 2 小时 |
| P3 | LOW-1/2/3 | 低优先级改进 | 各 5-15 分钟 |

---

## 五、结论

该文件上传功能在整体架构设计上合理，具备多层验证和基本的安全防护。但存在 **2 个 CRITICAL 级别漏洞**（YAML RCE 和潜在的 XXE），需要立即修复。建议修复后增加以下安全测试用例:

1. XXE payload XML 文件上传测试
2. YAML 反序列化攻击文件上传测试
3. ZIP 炸弹上传测试
4. 超长文件名上传测试
5. 伪装扩展名的恶意文件上传测试
6. 磁盘空间耗尽场景测试
