# TDD 执行报告：upload-document.controller.ts

## 基本信息

- **源文件**: `apis/controller/upload-document.controller.ts`
- **测试文件**: `tests/apis/upload-document.controller.test.ts`
- **执行时间**: 2026-05-24
- **测试框架**: Jest + Supertest

## 测试覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | **96%** |
| 分支覆盖率 (Branches) | **83.33%** |
| 函数覆盖率 (Functions) | **100%** |
| 行覆盖率 (Lines) | **95.91%** |

### 未覆盖代码

- **行 11, 17**: `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` — uploads 目录已存在时的目录创建分支，属于模块初始化代码，测试环境下无法覆盖。

## 测试用例明细（36 个测试）

### 集成测试（22 个）

#### 认证与权限（2 个）
1. `should return 401 without token` — 未携带 token 返回 401
2. `should return 403 for view role` — view 角色无权限返回 403

#### 成功上传（11 个）
3. `should upload PDF document successfully as sysadmin` — PDF 上传成功，验证返回字段（url、originalName、fileType、fileSize）
4. `should upload JSON document successfully as admin` — JSON 上传成功，admin 角色可操作
5. `should upload Markdown document successfully` — MD 文件上传
6. `should upload CSV document successfully` — CSV 文件上传
7. `should upload YAML document successfully` — YAML 文件上传
8. `should upload XML document successfully` — XML 文件上传
9. `should upload DOCX document successfully` — DOCX（ZIP 格式含 word/ 目录）上传
10. `should upload XLSX document successfully` — XLSX（ZIP 格式含 xl/ 目录）上传
11. `should upload PPTX document successfully` — PPTX（ZIP 格式含 ppt/ 目录）上传
12. `should upload YML document successfully` — YML 扩展名上传

#### 验证错误（9 个）
13. `should return 400 when no file provided` — 未提供文件
14. `should reject unsupported document format (.txt) with 400` — 不支持的 .txt 格式
15. `should reject unsupported document format (.exe) with 400` — 不支持的 .exe 格式
16. `should reject file exceeding 30MB with 400 (LIMIT_FILE_SIZE)` — 超过 30MB 文件大小限制
17. `should reject invalid JSON content with 400` — 无效 JSON 内容
18. `should reject invalid YAML content with 400` — 无效 YAML 内容
19. `should reject content type mismatch (PDF declared but content is JSON) with 400` — 文件内容与扩展名不匹配
20. `should reject generic ZIP (not Office format) with .docx extension with 400` — 通用 ZIP 伪装为 DOCX
21. `should reject empty CSV content with 400` — 空 CSV 文件
22. `should reject CSV without separator with 400` — CSV 无分隔符

### 单元测试（14 个）

#### uploadDocumentMiddleware（3 个）
23. `should verify middleware function exists and is callable` — 验证中间件函数存在
24. `should return 500 for generic multer error` — 使用 jest.isolateModules mock multer，测试非 LIMIT_FILE_SIZE、非格式错误的通用 multer 错误返回 500
25. `should return 500 with fallback message when error has no message` — multer 错误无消息时返回默认提示"上传失败"

#### uploadDocumentFile（11 个）
26. `should return 400 when req.file is undefined` — 文件为空
27. `should return 400 when content validation fails and delete uploaded file` — 内容验证失败并清理文件
28. `should return 200 with correct response on successful upload` — 成功上传返回完整响应
29. `should return 500 with error message when exception occurs during content validation` — 验证过程异常返回 500
30. `should return 500 with default message when error has no message` — 错误无消息时返回默认提示
31. `should clean up file on error when file exists` — 异常时清理已上传文件
32. `should handle error gracefully when file already deleted on error path` — 文件已不存在时的错误处理
33. `should upload valid XML document successfully via unit test` — XML 单元测试
34. `should upload valid Markdown document via unit test` — Markdown 单元测试
35. `should upload valid CSV document via unit test` — CSV 单元测试
36. `should upload valid YAML document via unit test` — YAML 单元测试

## 测试要点

### 覆盖的关键业务逻辑
- **Multer 中间件**: 文件大小限制（30MB）、文件格式过滤（13 种文档类型）
- **DocumentValidator 集成**: 内容验证、类型检测、扩展名与内容匹配校验
- **错误处理**: multer 错误码映射（LIMIT_FILE_SIZE → 400）、格式错误（400）、内部错误（500）
- **文件清理**: 验证失败时删除上传文件、异常时清理临时文件
- **权限控制**: JWT 认证、角色授权（sysadmin、admin 可访问，view 禁止）

### 技术细节
- 使用 `AdmZip` 构造合法的 DOCX/XLSX/PPTX 文件进行测试
- 通过 `jest.isolateModules` + `jest.doMock('multer')` mock multer 模块，覆盖通用错误 500 分支
- 通过 mock `DocumentValidator.validateContent` 测试异常路径
- 所有测试用例在测试后清理临时文件和上传文件

### 本次更新（2026-05-24）
- 新增 7 个测试用例（29 → 36 个）
- 分支覆盖率从 72.22% 提升至 83.33%
- 新增 middleware 通用错误 500 分支测试（使用 jest.isolateModules mock multer）
- 新增文件已删除时的异常路径测试
- 新增 XML/Markdown/CSV/YAML 的单元测试覆盖
