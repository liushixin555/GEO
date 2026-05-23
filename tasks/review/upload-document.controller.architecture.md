# apis/controller/upload-document.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件架构专家（分层架构 + 关注点分离 + 可扩展性 + 可维护性 + 存储抽象）
**文件路径**: `apis/controller/upload-document.controller.ts`
**代码行数**: 89 行
**关联文件**: `apis/utils/document-validator.ts`, `apis/controller/upload.controller.ts`, `apis/app.ts`, `apis/config/`
**严重级别**: HIGH(2) / MEDIUM(4) / LOW(2)

---

## 一、架构评价总览

文档上传控制器包含 2 个导出函数（`uploadDocumentMiddleware` 中间件 + `uploadDocumentFile` 处理器），与 `upload.controller.ts` 共享同一存储目录，配合 `DocumentValidator` 实现文档验证。从架构视角审视，该文件存在 **缺少服务层、存储无抽象、配置未外部化、与兄弟控制器重复** 四类核心架构缺陷。

项目其他业务模块遵循 `controller → service (interface) → service/impl (Prisma)` 三层架构，而上传模块跳过了 service 层，直接在 controller 中耦合了存储逻辑、验证编排和响应构造，破坏了项目的分层一致性。

| 架构维度 | 评分 | 说明 |
|----------|------|------|
| 分层一致性 | 3/10 | 跳过 service 层，controller 直接处理存储和验证编排 |
| 关注点分离 | 5/10 | multer 配置 + 验证编排 + 存储操作 + 响应构造全部在 89 行内 |
| DRY 原则 | 4/10 | 与 upload.controller.ts 大量重复（目录管理、multer 配置、文件命名） |
| 可扩展性 | 3/10 | 无存储抽象，迁移 S3/OSS 需重写 controller |
| 可配置性 | 4/10 | 上传目录、文件大小限制硬编码在 controller 中，未走 config 层 |
| 可测试性 | 6/10 | 函数可独立测试，但模块级副作用和 fs 直接耦合增加 mock 难度 |

### 项目架构一致性对比

| 模块 | Controller | Service | Impl | 存储抽象 |
|------|------------|---------|------|----------|
| company | ✅ 薄层 | ✅ 接口 | ✅ Prisma | ✅ |
| article | ✅ 薄层 | ✅ 接口 | ✅ Prisma | ✅ |
| upload (图片) | ❌ 厚层 | ❌ 无 | ❌ 无 | ❌ fs 直连 |
| upload-document (文档) | ❌ 厚层 | ❌ 无 | ❌ 无 | ❌ fs 直连 |
| skills (ZIP) | ❌ 厚层 | ❌ 无 | ❌ 无 | ❌ fs 直连 |

**结论**: 上传相关模块是项目中唯一未遵循三层架构的子系统，形成了一个架构孤岛。

---

## 二、架构问题清单

### HIGH-1: 缺少服务层 — 违反项目分层架构约定

**位置**: 整个文件

**问题分析**:

项目建立了一套清晰的三层架构模式：

```
Controller (路由处理、参数校验、响应构造)
    ↓
Service Interface (业务逻辑抽象)
    ↓
Service Implementation (Prisma/存储细节)
```

但 `upload-document.controller.ts` 将所有逻辑集中在 controller 中：

```
Controller ──→ multer (外部库)
           ──→ DocumentValidator (工具类)
           ──→ fs (文件系统直接操作)
           ──→ response util (响应构造)
```

**架构退化表现**:

1. **Controller 承担过多职责**: multer 配置（第 14-38 行）+ 上传处理（第 40-53 行）+ 验证编排（第 55-89 行）全部在一个文件中
2. **业务逻辑泄露到 controller**: 文件清理策略（第 69 行、第 83-84 行）属于业务逻辑，不应在 controller 中
3. **无法复用**: 如果需要在其他场景（如批量导入）重用文档上传逻辑，无法通过 service 调用

**修复建议**: 抽取 `UploadService` 接口和实现

```typescript
// apis/service/upload.service.ts
export interface UploadService {
  validateAndProcess(file: Express.Multer.File): Promise<UploadResult>;
  cleanup(filePath: string): Promise<void>;
}

export interface UploadResult {
  url: string;
  originalName: string;
  fileType: string;
  fileSize: number;
}

// apis/service/impl/upload.service.impl.ts
export class LocalUploadServiceImpl implements UploadService {
  async validateAndProcess(file: Express.Multer.File): Promise<UploadResult> {
    const ext = DocumentValidator.getExtension(file.originalname);
    const buffer = await fsp.readFile(file.path);
    const validation = await DocumentValidator.validateContent(buffer, ext);
    if (!validation.valid) {
      await this.cleanup(file.path);
      throw new ValidationError(validation.error || '文档内容格式校验失败');
    }
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      fileType: ext,
      fileSize: file.size,
    };
  }

  async cleanup(filePath: string): Promise<void> {
    try { await fsp.unlink(filePath); } catch { /* 文件可能已被删除 */ }
  }
}
```

Controller 变为薄层：

```typescript
// apis/controller/upload-document.controller.ts
export async function uploadDocumentFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) { fail(res, 400, '请选择要上传的文档'); return; }
    const result = await uploadService.validateAndProcess(req.file);
    success(res, result, '上传成功');
  } catch (err: unknown) {
    if (req.file) await uploadService.cleanup(req.file.path);
    const msg = err instanceof ValidationError ? err.message : '上传失败';
    fail(res, err instanceof ValidationError ? 400 : 500, msg);
  }
}
```

---

### HIGH-2: 无存储抽象 — 直接耦合文件系统

**位置**: 第 9-12 行（目录创建）、第 14-26 行（multer storage）、第 63 行（文件读取）、第 69/84 行（文件删除）

**问题分析**:

存储操作散布在 controller 的四个位置，全部硬编码为本地文件系统：

| 操作 | 位置 | 当前实现 | 问题 |
|------|------|----------|------|
| 目录管理 | 第 9-12 行 | `fs.mkdirSync(UPLOAD_DIR)` | 与 app.ts 中的 static serve 耦合 |
| 文件写入 | 第 14-26 行 | `multer.diskStorage` | 无法切换到 S3/OSS |
| 文件读取 | 第 63 行 | `fs.readFileSync` | 无法读取远程存储 |
| 文件删除 | 第 69、84 行 | `fs.unlinkSync` | 无法删除远程存储 |

**扩展性影响**:

- 迁移到对象存储（S3/OSS）需要重写整个 controller
- 无法支持多存储后端（开发环境本地 + 生产环境 S3）
- 无法支持读写分离（CDN 读 + 对象存储写）
- 与 `upload.controller.ts` 的存储逻辑完全重复

**修复建议**: 抽取 `StorageProvider` 接口

```typescript
// apis/service/storage.provider.ts
export interface StorageProvider {
  write(key: string, data: Buffer): Promise<string>; // 返回 URL
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  ensureBucket(): Promise<void>;
}

// apis/service/impl/local-storage.provider.ts
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly baseDir: string, private readonly urlPrefix: string) {}
  // ...
}

// apis/service/impl/s3-storage.provider.ts
export class S3StorageProvider implements StorageProvider {
  constructor(private readonly bucket: string, private readonly region: string) {}
  // ...
}
```

---

### MEDIUM-1: 与 upload.controller.ts 架构重复 — 违反 DRY 原则

**位置**: 整个文件

**问题分析**:

两个上传控制器存在大量架构级重复：

| 重复项 | upload.controller.ts | upload-document.controller.ts | 差异 |
|--------|---------------------|-------------------------------|------|
| 目录创建 | `fs.mkdirSync(UPLOAD_DIR)` | `if(!existsSync) mkdirSync(UPLOAD_DIR)` | 仅条件检查不同 |
| UPLOAD_DIR 常量 | `path.resolve(process.cwd(), 'uploads')` | 相同 | 零差异 |
| multer diskStorage | 第 38-47 行 | 第 14-26 行 | 命名策略不同 |
| UUID 文件名 | `crypto.randomUUID()` | 相同 | 零差异 |
| 文件删除 | `fs.unlinkSync` | 相同 | 零差异 |
| 响应格式 | `{ url }` | `{ url, originalName, fileType, fileSize }` | 文档版本字段更多 |

此外，`skills.controller.ts` 也有类似的上传逻辑（ZIP 文件处理）。

**架构影响**: 三个上传控制器各自独立管理存储，形成三个"架构孤岛"。如果需要修改存储策略（如迁移 S3），需要同时修改三个文件。

**修复建议**: 统一上传服务

```typescript
// apis/service/upload.service.ts
export interface UploadService {
  configureMulter(options: UploadOptions): multer.Multer;
  processUpload(file: Express.Multer.File): Promise<UploadResult>;
  cleanup(filePath: string): Promise<void>;
}

export interface UploadOptions {
  allowedExtensions?: string[];
  maxFileSize: number;
  validator?: (buffer: Buffer, ext: string) => Promise<ValidationResult>;
}
```

---

### MEDIUM-2: 配置未外部化 — 硬编码存储路径和限制

**位置**: 第 9 行、第 30 行

```typescript
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');  // 硬编码
limits: { fileSize: DocumentValidator.MAX_FILE_SIZE },       // 委托给 DocumentValidator
```

**问题分析**:

1. **`UPLOAD_DIR` 未走 config 层**: 项目使用 `config/default.json` + `.env` 管理配置，但上传目录硬编码在 controller 中
2. **`process.cwd()` 依赖**: 上传目录相对于运行时工作目录，在 Docker 容器或不同部署环境中可能指向不同位置
3. **与 app.ts 的隐式契约**: `app.ts:62` 使用 `express.static(path.resolve(process.cwd(), 'uploads'))` 提供静态文件服务，两个文件独立拼出同一个路径，形成隐式耦合
4. **无环境区分**: 开发环境和生产环境的存储目录、文件大小限制可能需要不同配置

**修复建议**: 将上传配置纳入 config 层

```json
// config/default.json
{
  "upload": {
    "dir": "uploads",
    "maxDocumentSize": 31457280,
    "maxImageSize": 10485760
  }
}
```

```typescript
// apis/config/index.ts 中导出
export const uploadConfig = config.upload;
```

---

### MEDIUM-3: 模块级副作用 — import 时执行文件系统操作

**位置**: 第 9-12 行

```typescript
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
```

**问题分析**:

1. **import 副作用**: `app.ts:22` 的 `import { uploadDocumentMiddleware, uploadDocumentFile }` 会触发目录创建
2. **测试困难**: 测试需要 `jest.isolateModules` 才能控制此行为
3. **与 `upload.controller.ts` 的竞态**: 两个模块都会在 import 时尝试创建同一目录（虽然 `recursive: true` 使其安全，但语义上不正确）
4. **与 `skills.controller.ts` 的同类问题**: 三个上传控制器都有模块级副作用

**架构视角**: 目录创建属于基础设施初始化，应在应用启动时统一处理（如 `server.ts`），而非分散在各个 controller 的模块级代码中。

**修复建议**: 将上传目录初始化移至应用启动阶段

```typescript
// server.ts 或 app.ts
function ensureUploadDirs() {
  const dirs = ['uploads', 'tmp/uploads'];
  for (const dir of dirs) {
    const full = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

ensureUploadDirs(); // 应用启动时统一创建
```

---

### MEDIUM-4: 无文件生命周期管理 — 孤文件累积

**位置**: 整个文件（系统性缺失）

**问题分析**:

1. **无持久化记录**: 上传成功后，文件 URL 返回给客户端，但系统不记录文件与业务实体的关联
2. **孤文件来源**:
   - 验证通过但从未被关联到业务记录的文件（用户上传了但未提交表单）
   - 关联记录被删除后，文件未同步清理
3. **累积速度**: 文档文件平均 5-30MB，远大于图片（1-10MB），1000 个孤文件可占 5-30GB
4. **三个上传控制器无共享管理**: `upload.controller`、`upload-document.controller`、`skills.controller` 各自管理不同类型的文件，但没有任何统一的文件追踪机制

**架构视角**: 这是数据架构层面的缺陷 — 缺少一个 `Upload` 或 `File` 实体来追踪文件生命周期。

**修复建议**:

```prisma
// prisma/schema.prisma
model Upload {
  id          String   @id @default(cuid())
  filename    String   @unique
  originalName String
  mimeType    String
  fileSize    Int
  uploadType  String   // "image" | "document" | "skill"
  url         String
  referencedBy String? // 关联的业务实体 ID
  createdAt   DateTime @default(now())
  expiresAt   DateTime? // 过期时间，用于清理
}
```

---

### LOW-1: 中间件与处理器分拆但耦合紧密

**位置**: 第 40-53 行 vs 第 55-89 行

**问题分析**:

`uploadDocumentMiddleware`（multer 中间件）和 `uploadDocumentFile`（业务处理器）被拆分为两个函数，通过 Express 中间件链连接：

```
app.post('/api/upload/document', auth, role, uploadDocumentMiddleware, uploadDocumentFile)
```

这种拆分本身是合理的（multer 需要在中间件链中运行），但存在以下架构问题：

1. **隐式契约**: `uploadDocumentFile` 假设 `req.file` 已由 `uploadDocumentMiddleware` 设置，但这个契约只在 `app.ts` 的路由定义中体现
2. **无法独立使用**: 如果某个场景需要不同的 multer 配置（如批量上传），无法复用 `uploadDocumentFile`
3. **错误处理分散**: 中间件处理 multer 错误，处理器处理验证错误，错误处理逻辑分散在两处

---

### LOW-2: 响应格式与图片上传不一致

**位置**: 第 74-80 行

```typescript
// 文档上传响应 — 4 个字段
success(res, { url, originalName: req.file.originalname, fileType: ext, fileSize: req.file.size }, '上传成功');

// 图片上传响应 — 1 个字段
success(res, { url }, '上传成功');
```

**问题分析**:

两个上传接口返回不同的响应结构，前端需要针对不同上传类型解析不同字段。虽然功能上可行，但违背了项目 CLAUDE.md 中"API 响应格式一致性"的要求。

---

## 三、架构正面发现

1. **中间件+处理器分离**: 将 multer 处理与业务逻辑拆分为两个函数，通过路由链连接，保持职责清晰
2. **DocumentValidator 委托**: 验证逻辑委托给专用工具类（`apis/utils/document-validator.ts`），控制器不关心验证细节
3. **UUID 文件名策略**: `crypto.randomUUID()` 有效隔离用户输入与文件系统，防止路径遍历
4. **失败清理机制**: 验证失败和异常均有文件清理，防止磁盘泄漏
5. **精确错误码**: `LIMIT_FILE_SIZE` 返回 400，与业务语义一致
6. **路由层权限控制**: `app.ts:171` 正确配置了 `authMiddleware + roleMiddleware('sysadmin', 'admin')`
7. **响应工具函数**: 使用 `success()` / `fail()` 保持响应格式统一

---

## 四、目标架构建议

### 当前架构

```
app.ts (路由)
  ├── authMiddleware
  ├── roleMiddleware
  ├── uploadDocumentMiddleware (multer 配置 + 目录创建)
  └── uploadDocumentFile (验证 + fs 操作 + 响应)
        ├── DocumentValidator (工具类)
        └── fs (直接耦合)
```

### 推荐架构

```
app.ts (路由)
  ├── authMiddleware
  ├── roleMiddleware
  ├── UploadMiddlewareFactory.create(DocumentUploadOptions)
  └── UploadController.handle()
        └── UploadService (接口)
              ├── DocumentValidator (验证策略)
              └── StorageProvider (接口)
                    ├── LocalStorageProvider (开发)
                    └── S3StorageProvider (生产)

config/
  └── upload 配置 (目录、大小限制、存储类型)

prisma/
  └── Upload 模型 (文件追踪)
```

### 改造步骤

| 阶段 | 工作内容 | 预估 |
|------|----------|------|
| Phase 1 | 抽取 `UploadService` 接口 + `LocalUploadServiceImpl`，controller 变薄 | 1-2 天 |
| Phase 2 | 抽取 `StorageProvider` 接口，配置外部化 | 1 天 |
| Phase 3 | 合并三个上传控制器的公共逻辑 | 1 天 |
| Phase 4 | 添加 `Upload` Prisma 模型，文件生命周期管理 | 2-3 天 |

---

## 五、与其他上传控制器架构对比

| 架构特征 | upload.controller (图片) | upload-document.controller (文档) | skills.controller (ZIP) |
|----------|--------------------------|----------------------------------|------------------------|
| Service 层 | ❌ 无 | ❌ 无 | ❌ 无 |
| 存储抽象 | ❌ fs 直连 | ❌ fs 直连 | ❌ fs 直连 |
| 验证策略 | MIME + 文件签名 | DocumentValidator (Magic Bytes + 解析) | ZIP 检查 |
| 目录管理 | 模块级 mkdirSync | 模块级 existsSync + mkdirSync | 模块级 mkdirSync |
| 文件清理 | 有（改进后） | 有 | 有 |
| 配置外部化 | ❌ | ❌ | ❌ |
| 文件追踪 | ❌ | ❌ | ❌ |
| 共同问题 | 三个上传控制器共享以上所有架构缺陷 |

**结论**: 三个上传控制器构成一个架构同质的子系统，应当统一重构而非单独优化。

---

## 六、评审结论

**判定: 架构需改进 — 功能正确但分层和抽象缺失**

文档上传控制器在功能实现上是正确的（验证逻辑严格、清理机制完善、错误处理合理），但在架构层面存在系统性缺陷：

1. **最大问题: 缺少 Service 层（H-1）** — 这是项目唯一没有 service 层的业务子系统。其他模块（company、article、knowledge 等）都遵循三层架构，上传模块的例外破坏了项目架构的一致性，增加了新人理解成本和维护成本。

2. **核心改进: 存储抽象（H-2）** — 直接耦合 `fs` 意味着迁移到云存储需要重写整个 controller。引入 `StorageProvider` 接口可以保护 controller 层不受存储实现变化的影响。

3. **短期改善: 消除重复（M-1）** — 三个上传控制器的存储逻辑高度重复，统一后可将上传相关的代码量减少 50%+。

4. **长期规划: 文件管理（M-4）** — 添加 Prisma `Upload` 模型是支持文件生命周期管理的前提，也是实现存储配额、清理任务的基础。

**优先级建议**: 先统一三个上传控制器（Phase 1-3），再添加文件追踪（Phase 4）。在引入新功能（如批量上传、文件管理界面）之前完成重构，避免在已有技术债上叠加新债。

---

*软件架构专家评审完成 — 2026-05-24*
