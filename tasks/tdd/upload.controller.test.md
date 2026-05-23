# TDD 执行报告：upload.controller.ts

## 基本信息

- **源文件**: `apis/controller/upload.controller.ts`
- **测试文件**: `tests/apis/upload.controller.test.ts`
- **执行日期**: 2026-05-23
- **测试框架**: Jest + Supertest

## 测试结果

**18 个测试全部通过**

| # | 测试用例 | 结果 | 耗时 |
|---|---------|------|------|
| 1 | should return 401 without token | PASS | 78ms |
| 2 | should return 403 for view role | PASS | 56ms |
| 3 | should upload PNG image successfully as sysadmin | PASS | 138ms |
| 4 | should upload image successfully as admin | PASS | 76ms |
| 5 | should upload JPEG image successfully | PASS | 90ms |
| 6 | should upload GIF image successfully | PASS | 59ms |
| 7 | should upload WebP image successfully | PASS | 15ms |
| 8 | should upload SVG image successfully | PASS | 19ms |
| 9 | should return 400 when no file provided | PASS | 12ms |
| 10 | should reject non-image files with 400 (unsupported format) | PASS | 17ms |
| 11 | should reject file exceeding 10MB with 500 | PASS | 110ms |
| 12 | should reject unsupported file type (.pdf) | PASS | 6ms |
| 13 | should reject unsupported file type (.doc) | PASS | 4ms |
| 14 | should return 400 when req.file is undefined (unit) | PASS | 1ms |
| 15 | should return 200 with correct url on success (unit) | PASS | - |
| 16 | should return 500 when exception occurs with error message (unit) | PASS | - |
| 17 | should return 500 with default message when error has no message (unit) | PASS | - |
| 18 | should handle file with various extensions correctly (unit) | PASS | - |

## 覆盖率分析

| 指标 | 覆盖率 | 详情 |
|------|--------|------|
| Statements | 94.44% | 34/36 |
| Branches | 75% | 6/8 |
| Functions | 100% | 4/4 |
| Lines | 94.44% | 34/36 |

### 未覆盖行

| 行号 | 代码 | 原因 |
|------|------|------|
| 10 | `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` | 模块加载时 uploads 目录已存在，if 分支不进入 |
| 19 | `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` | multer storage destination 回调中，目录已存在 |

### 未覆盖分支

- `!fs.existsSync(UPLOAD_DIR)` 的 true 分支（行 9、18 两处 mkdirSync）
- 这两个分支在测试环境中无法触发（uploads 目录在 beforeAll 中已创建）

## 测试分类

### 集成测试（13 个）

**认证与权限（2 个）**
- 401：无 token 访问
- 403：view 角色无权限

**成功上传（6 个）**
- sysadmin 上传 PNG
- admin 上传 PNG
- 上传 JPEG 文件
- 上传 GIF 文件
- 上传 WebP 文件
- 上传 SVG 文件

**验证错误（5 个）**
- 未提供文件 → 400
- 非图片文件（.txt）→ 400 '不支持的图片格式'
- 文件超过 10MB → 500
- 不支持的格式（.pdf）→ 400
- 不支持的格式（.doc）→ 400

### 单元测试（5 个）

- `uploadFile` req.file 为 undefined → 400
- `uploadFile` 成功 → 200 + url
- `uploadFile` 异常有 message → 500
- `uploadFile` 异常无 message → 500 '上传失败'
- `uploadFile` 各种扩展名处理

## 关键测试场景覆盖

| 场景 | 覆盖 |
|------|------|
| JWT 认证检查 | ✅ |
| 角色权限检查（sysadmin/admin/view） | ✅ |
| 允许的图片类型（jpeg/png/gif/webp/svg+xml） | ✅ 全部 5 种 |
| 文件大小限制（10MB） | ✅ |
| 不支持的文件格式拒绝 | ✅ |
| 无文件上传处理 | ✅ |
| uploadFile 异常处理（try/catch） | ✅ |
| uploadFile 默认错误消息 | ✅ |
| 文件 URL 格式正确性 | ✅ |
| multer 错误分类（400 vs 500） | ✅ |
