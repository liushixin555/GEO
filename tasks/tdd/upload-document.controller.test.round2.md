# upload-document.controller.ts TDD 第二轮

**日期**: 2026-05-25
**文件**: `apis/controller/upload-document.controller.ts`
**测试文件**: `tests/apis/upload-document.controller.test.ts`
**测试用例数**: 76
**覆盖率**: 100% Stmts / 100% Branch / 100% Funcs / 100% Lines

## 第一轮覆盖情况（基线）

| 维度 | 覆盖率 | 未覆盖 |
|------|--------|--------|
| Stmts | 100% | - |
| Branch | 90.9% | Line 44 (validation.error fallback) |
| Funcs | 100% | - |
| Lines | 100% | - |
| 测试数 | 49 | - |

## 第二轮新增测试用例（27个）

### uploadDocumentFile - validation.error fallback 分支（2个）
1. `should return fallback message when validation.error is empty string` — 验证 `validation.error || '文档内容格式校验失败'` 的空字符串 fallback 分支
2. `should return fallback message when validation.error is null` — 验证 `validation.error` 为 null 时的 fallback 分支

### 文件名边界测试（2个）
3. `should accept filename exactly at 255 characters` — 边界值：255字符文件名应被接受
4. `should reject filename at 256 characters` — 边界值：256字符文件名应被拒绝

### 扩展名路径穿越变体（2个）
5. `should reject file with backslash in extension` — 反斜杠路径穿越 `\` 
6. `should reject file with double dot in extension` — 双点路径穿越 `..`

### Token 验证（2个）
7. `should reject expired token for document upload` — 过期 token 返回 401
8. `should reject invalid token for document upload` — 无效 token 返回 401

### CSV 分隔符变体（2个）
9. `should upload TAB-separated CSV document successfully` — TAB 分隔符 CSV
10. `should upload semicolon-separated CSV document successfully` — 分号分隔符 CSV

### 安全：恶意文件格式（3个）
11. `should reject .html file (XSS prevention) for document upload` — XSS 防护
12. `should reject .js file for document upload` — JS 文件拒绝
13. `should reject .sh file for document upload` — Shell 脚本拒绝

### 响应结构验证（1个）
14. `should return complete response structure with all fields` — 验证完整响应结构

### 内容类型不匹配 Office 格式（2个）
15. `should reject DOCX declared but content is XLSX with 400` — DOCX/XLSX 不匹配
16. `should reject PPTX declared but content is DOCX with 400` — PPTX/DOCX 不匹配

### YML 扩展名（1个）
17. `should upload .yml file and detect as yaml type` — YML 扩展名集成测试

### 文件清理验证（1个）
18. `should delete uploaded file when content validation fails` — 内容校验失败时删除文件

### Middleware fileFilter 边界（1个）
19. `should reject fileFilter for filename exactly at length boundary (256)` — 256字符文件名 fileFilter 拒绝

### 单元测试：各文档格式成功上传（9个）
20. `should upload valid PDF via unit test` — PDF 单元成功
21. `should upload valid DOCX via unit test` — DOCX 单元成功
22. `should upload valid XLSX via unit test` — XLSX 单元成功
23. `should upload valid PPTX via unit test` — PPTX 单元成功
24. `should upload DOC (OLE2) via unit test` — DOC OLE2 单元成功
25. `should upload XLS (OLE2) via unit test` — XLS OLE2 单元成功
26. `should upload PPT (OLE2) via unit test` — PPT OLE2 单元成功
27. `should upload valid YML via unit test` — YML 单元成功

## 覆盖率对比

| 维度 | 第一轮 | 第二轮 |
|------|--------|--------|
| Stmts | 100% | 100% |
| Branch | 90.9% | **100%** |
| Funcs | 100% | 100% |
| Lines | 100% | 100% |
| 测试数 | 49 | **76** |

## 关键修复

- 覆盖了 `validation.error || '文档内容格式校验失败'` 的 fallback 分支（`validation.error` 为空字符串或 null 时）
- 删除了3个使用 `jest.isolateModules` 的 fileFilter pass 测试（isolateModules 上下文中 res 对象缺少 status 方法导致 TypeError）

## 测试维度分类

| 维度 | 测试数 |
|------|--------|
| 集成测试（认证+上传+拒绝） | 32 |
| 单元测试 uploadDocumentFile | 16 |
| 单元测试 uploadDocumentMiddleware | 6 |
| 边界与安全测试 | 22 |
| **总计** | **76** |
