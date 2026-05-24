# TDD 执行报告：upload.controller.ts

## 基本信息

- **源文件**: `apis/controller/upload.controller.ts`
- **测试文件**: `tests/apis/upload.controller.test.ts`
- **执行日期**: 2026-05-24
- **测试框架**: Jest + Supertest

## 测试结果

**39 个测试全部通过**

| # | 测试用例 | 结果 | 类型 |
|---|---------|------|------|
| 1 | should return 401 without token | PASS | 集成-认证 |
| 2 | should return 403 for view role | PASS | 集成-权限 |
| 3 | should upload PNG image successfully as sysadmin | PASS | 集成-成功 |
| 4 | should upload image successfully as admin | PASS | 集成-成功 |
| 5 | should upload JPEG image successfully | PASS | 集成-成功 |
| 6 | should upload GIF image successfully | PASS | 集成-成功 |
| 7 | should upload WebP image successfully | PASS | 集成-成功 |
| 8 | should reject SVG files with 400 | PASS | 集成-格式 |
| 9 | should return 400 when no file provided | PASS | 集成-验证 |
| 10 | should reject non-image files with 400 | PASS | 集成-格式 |
| 11 | should reject file exceeding 10MB with 413 | PASS | 集成-大小 |
| 12 | should reject unsupported file type (.pdf) | PASS | 集成-格式 |
| 13 | should reject unsupported file type (.doc) | PASS | 集成-格式 |
| 14 | should reject MIME-forged file | PASS | 集成-安全 |
| 15 | should return 400 with wrong field name (LIMIT_UNEXPECTED_FILE) | PASS | 集成-Multer |
| 16 | should return 400 when req.file is undefined | PASS | 单元 |
| 17 | should return 200 with correct url on success | PASS | 单元 |
| 18 | should return 500 with generic message when exception occurs | PASS | 单元 |
| 19 | should return 500 with default message when error has no message | PASS | 单元 |
| 20 | should handle file with various extensions correctly | PASS | 单元 |
| 21 | should reject file when content does not match declared MIME type | PASS | 单元 |
| 22 | should return false for unknown mimetype (image/bmp) | PASS | 单元-签名 |
| 23 | should verify JPEG signature correctly | PASS | 单元-签名 |
| 24 | should verify GIF signature correctly | PASS | 单元-签名 |
| 25 | should verify WebP signature correctly | PASS | 单元-签名 |
| 26 | should reject JPEG with corrupted signature | PASS | 单元-签名 |
| 27 | should reject GIF with corrupted signature | PASS | 单元-签名 |
| 28 | should reject WebP with corrupted signature | PASS | 单元-签名 |
| 29 | should handle cleanup failure when verifyFileSignature rejects | PASS | 单元-错误 |
| 30 | should return 500 and attempt cleanup when success path throws | PASS | 单元-错误 |
| 31 | should handle filename with special characters | PASS | 边界 |
| 32 | should handle file with no extension | PASS | 边界 |
| 33 | should handle BMP file rejection | PASS | 边界 |
| 34 | should handle TIFF file rejection | PASS | 边界 |
| 35 | should reject .exe file | PASS | 安全 |
| 36 | should reject .zip file | PASS | 安全 |
| 37 | should reject .html file (XSS prevention) | PASS | 安全 |
| 38 | should reject expired token | PASS | 安全 |
| 39 | should reject invalid token | PASS | 安全 |

## 覆盖率分析

| 指标 | 覆盖率 | 详情 |
|------|--------|------|
| Statements | **96.55%** | 28/29 |
| Branches | **84.21%** | 16/19 |
| Functions | **100%** | 4/4 |
| Lines | **96.42%** | 54/56 |

### 未覆盖分支

| 行号 | 代码 | 原因 |
|------|------|------|
| 74 | `fail(res, 400, '上传参数错误')` | 通用 MulterError（如 LIMIT_FILE_COUNT）在 multer.single() 场景下无法通过 supertest 触发 |
| 79 | `fail(res, 500, '上传失败')` | uploadMiddleware 接收非 Error 非 MulterError 的异常对象为防御性代码，实际运行不可达 |

## 本次补全新增测试用例（相比上次 +10 个）

### LIMIT_UNEXPECTED_FILE 覆盖（1 个）
- 使用错误字段名（'image' 代替 'file'）上传 → 400 '上传字段名应为 file'

### verifyFileSignature 签名验证（7 个）
- 未知 MIME 类型（image/bmp）→ 400
- JPEG 签名验证正确 → 200
- GIF 签名验证正确 → 200
- WebP 签名验证正确 → 200
- JPEG 签名损坏 → 400 + 文件清理
- GIF 签名损坏 → 400 + 文件清理
- WebP 签名损坏 → 400 + 文件清理

### uploadFile 错误路径（2 个）
- verifyFileSignature 失败时文件清理
- 成功路径抛出异常时的清理和 500 响应

## 关键测试场景覆盖

| 场景 | 覆盖 |
|------|------|
| JWT 认证检查（无 token / 过期 / 无效） | ✅ |
| 角色权限检查（sysadmin/admin/view） | ✅ |
| 允许的图片类型（jpeg/png/gif/webp） | ✅ 全部 4 种 |
| 文件大小限制（10MB → 413） | ✅ |
| 不支持的文件格式拒绝（txt/pdf/doc/bmp/tiff/exe/zip/html/svg） | ✅ 9 种 |
| 无文件上传处理 → 400 | ✅ |
| 错误字段名 → LIMIT_UNEXPECTED_FILE → 400 | ✅ |
| MIME 伪造文件检测（magic bytes 校验） | ✅ |
| 文件内容与 MIME 不匹配时自动清理 | ✅ |
| uploadFile 异常处理（try/catch → 500） | ✅ |
| 文件 URL 格式正确性（/uploads/xxx.ext） | ✅ |
| 特殊字符文件名处理 | ✅ |
| XSS 防护（.html 上传拒绝） | ✅ |

## 覆盖率提升

| 指标 | 上次 | 本次 | 提升 |
|------|------|------|------|
| Statements | 87.93% | **96.55%** | +8.62% |
| Branches | 63.15% | **84.21%** | +21.06% |
| Functions | 100% | **100%** | - |
| Lines | 91.07% | **96.42%** | +5.35% |
| 测试数量 | 29 | **39** | +10 |
