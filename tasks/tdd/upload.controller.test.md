# TDD 执行报告：upload.controller.ts

## 基本信息

- **源文件**: `apis/controller/upload.controller.ts`
- **测试文件**: `tests/apis/upload.controller.test.ts`
- **执行日期**: 2026-05-24
- **测试框架**: Jest + Supertest

## 测试结果

**29 个测试全部通过**

| # | 测试用例 | 结果 | 类型 |
|---|---------|------|------|
| 1 | should return 401 without token | PASS | 集成 |
| 2 | should return 403 for view role | PASS | 集成 |
| 3 | should upload PNG image successfully as sysadmin | PASS | 集成 |
| 4 | should upload image successfully as admin | PASS | 集成 |
| 5 | should upload JPEG image successfully | PASS | 集成 |
| 6 | should upload GIF image successfully | PASS | 集成 |
| 7 | should upload WebP image successfully | PASS | 集成 |
| 8 | should upload SVG image successfully | PASS | 集成 |
| 9 | should return 400 when no file provided | PASS | 集成 |
| 10 | should reject non-image files with 400 (unsupported format) | PASS | 集成 |
| 11 | should reject file exceeding 10MB with 500 | PASS | 集成 |
| 12 | should reject unsupported file type (.pdf) | PASS | 集成 |
| 13 | should reject unsupported file type (.doc) | PASS | 集成 |
| 14 | should return 400 when req.file is undefined | PASS | 单元 |
| 15 | should return 200 with correct url on success | PASS | 单元 |
| 16 | should return 500 when exception occurs with error message | PASS | 单元 |
| 17 | should return 500 with default message when error has no message | PASS | 单元 |
| 18 | should handle file with various extensions correctly | PASS | 单元 |
| 19 | should create upload directory in storage callback when dir does not exist | PASS | 集成(mkdirSync) |
| 20 | should cover mkdirSync when UPLOAD_DIR does not exist at module init | PASS | 单元(isolateModules) |
| 21 | should handle filename with special characters | PASS | 边界 |
| 22 | should handle file with no extension | PASS | 边界 |
| 23 | should handle BMP file rejection | PASS | 边界 |
| 24 | should handle TIFF file rejection | PASS | 边界 |
| 25 | should reject .exe file | PASS | 安全 |
| 26 | should reject .zip file | PASS | 安全 |
| 27 | should reject .html file (XSS prevention) | PASS | 安全 |
| 28 | should reject expired token | PASS | 安全 |
| 29 | should reject invalid token | PASS | 安全 |

## 覆盖率分析

| 指标 | 覆盖率 | 详情 |
|------|--------|------|
| Statements | **100%** | 36/36 |
| Branches | **91.66%** | 11/12 |
| Functions | **100%** | 4/4 |
| Lines | **100%** | 36/36 |

### 未覆盖分支

| 行号 | 代码 | 原因 |
|------|------|------|
| 46 | `err.message \|\| '上传失败'` | multer 错误始终包含 message，`\|\| '上传失败'` fallback 路径在实际运行中不可达 |

## 新增测试用例（本次补全）

相比上一版本（18 个测试），新增 11 个测试用例：

### 目录创建分支覆盖（2 个）
- 临时重命名 uploads 目录，触发 multer storage destination 中的 mkdirSync（line 19）
- 使用 jest.isolateModules + mock fs 覆盖模块初始化时 mkdirSync（line 10）

### 边界测试（4 个）
- 特殊字符文件名（中文、空格、括号）
- 无扩展名文件 → 400
- BMP 文件拒绝 → 400
- TIFF 文件拒绝 → 400

### 安全测试（5 个）
- .exe 可执行文件拒绝 → 400
- .zip 压缩文件拒绝 → 400
- .html 文件拒绝（XSS 防护）→ 400
- 过期 token 拒绝 → 401
- 无效 token 拒绝 → 401

## 关键测试场景覆盖

| 场景 | 覆盖 |
|------|------|
| JWT 认证检查 | ✅ |
| 角色权限检查（sysadmin/admin/view） | ✅ |
| 允许的图片类型（jpeg/png/gif/webp/svg+xml） | ✅ 全部 5 种 |
| 文件大小限制（10MB） | ✅ |
| 不支持的文件格式拒绝（txt/pdf/doc/bmp/tiff/exe/zip/html） | ✅ 8 种 |
| 无文件上传处理 | ✅ |
| uploadFile 异常处理（try/catch） | ✅ |
| uploadFile 默认错误消息 | ✅ |
| 文件 URL 格式正确性 | ✅ |
| multer 错误分类（400 vs 500） | ✅ |
| 目录不存在时自动创建 | ✅ |
| 特殊字符文件名处理 | ✅ |
| Token 过期/无效 | ✅ |
| XSS 防护（.html 上传拒绝） | ✅ |

## 覆盖率提升

| 指标 | 上次 | 本次 | 提升 |
|------|------|------|------|
| Statements | 94.44% | **100%** | +5.56% |
| Branches | 75% | **91.66%** | +16.66% |
| Functions | 100% | **100%** | - |
| Lines | 94.44% | **100%** | +5.56% |
| 测试数量 | 18 | **29** | +11 |
