# TDD 执行报告：Company Controller 第二轮补全

## 执行时间
2026-05-25

## 测试结果
- 测试套件：1 passed, 1 total
- 测试用例：**183 passed**, 0 failed
- 覆盖率：**Stmts 100%, Branch 100%, Funcs 100%, Lines 100%**
- 耗时：96.5s

## 变更记录

### 2026-05-25 第二轮补全（404 → 183 用例，当前文件独立 183 用例）
- 新增 60 个测试用例，覆盖 12 个全新测试维度
- 修复 controller bug：toggleCompanyStatus 缺少 BusinessError 处理（导致同状态切换返回 500 而非 400）

## 修复的 Bug

### BUG-1: toggleCompanyStatus 未捕获 BusinessError
- **现象**：同状态切换（如已启用再启用）返回 500 而非 400
- **根因**：controller catch 块仅处理 NotFoundError，未处理 BusinessError
- **修复**：在 `toggleCompanyStatus` 的 catch 块中添加 `BusinessError instanceof` 分支，返回 400 + err.message
- **文件**：`apis/controller/company.controller.ts` 第 99-106 行

### 发现的 Schema 问题（未修复，仅记录）
- Zod schema `.trim()` 位于 `.min(1)` 之后，导致空格字符串（如 `'   '`）通过 min(1) 验证后被 trim 为空字符串
- 建议：将 `.trim()` 移至 `.min(1)` 之前

## 新增测试维度

### 1. HTTP 方法限制（4 用例）
- DELETE /api/v1/companies → 404
- PATCH /api/v1/companies/1 → 404
- POST /api/v1/companies/1 → 404
- DELETE /api/v1/companies/1 → 404

### 2. Token 异变测试（6 用例）
- token 缺少 userId 字段
- token 缺少 role 字段
- Authorization 空字符串
- Authorization 无 Bearer 前缀
- Basic auth 方式
- 未知角色（superadmin）

### 3. ID 解析边界（5 用例）
- 科学计数法 ID（1e10）
- 十六进制 ID（0x10）
- URL 编码空格 ID（%201%20）
- URL 编码加号 ID（%2B1）
- MAX_SAFE_INTEGER ID

### 4. 请求体边界（4 用例）
- body 为 null
- body 为字符串
- body 为数字
- body 含额外未知字段（应忽略）

### 5. Schema 深度验证（12 用例）
- contact_person 超过 100 字符 / 边界 100 字符
- contact_phone 超过 20 字符 / 边界 20 字符
- operator_ids 含负数 / 零 / 小数
- viewer_ids 含负数 / 字符串
- address 边界 500 字符
- full_name 边界 200 字符
- viewer_ids 空数组

### 6. ToggleStatus BusinessError 分支（2 用例）
- 同状态切换（已启用→启用）返回 400 "已处于启用状态"
- 同状态切换（已禁用→禁用）返回 400 "已处于禁用状态"

### 7. 响应结构一致性（4 用例）
- list 成功响应格式 { code: 0, message, data: [] }
- detail 成功响应格式 { code: 0, message, data: {} }
- create 成功响应格式（201）{ code: 0, message, data }
- 错误响应格式 { code, message }

### 8. Update 深度边界（6 用例）
- operator_ids 含负数
- viewer_ids 超过 100
- contact_phone 含字母
- contact_person 超过 100
- short_name 超过 50
- address 超过 500

### 9. 并发与幂等性（2 用例）
- 5 个并发 list 请求均返回正确结果
- 重复 detail 请求返回相同数据

### 10. Create 深度分支（2 用例）
- 重复 operator_ids（去重验证）
- 单个 viewer_id（updateMany 调用次数验证）

### 11. Update 深度分支（2 用例）
- BusinessError 批量用户不存在
- 无 viewer_ids 字段更新

### 12. 常量消息验证 + Schema Whitespace（7 用例）
- 5 个端点的错误消息常量验证
- short_name trim 行为验证
- 空格字符串通过 min(1) 验证（schema trim 在 min 之后）

## 测试文件
- `tests/apis/company.controller.test.ts`（约 3340 行）
