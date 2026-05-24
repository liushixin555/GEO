# TDD 执行报告：LLM Model Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：157 passed, 0 failed
- 覆盖率：Stmts 91.47%, Branch 81.63%, Funcs 100%, Lines ~91%

## 修复的Bug
1. llm-model.controller.ts: 修复 IPv6 主机名检测的 SSRF 防护（BLOCKED_HOSTNAMES 正则现在匹配带方括号的 IPv6 地址如 [::1]）
2. llm-model.controller.test.ts: 修复 API 路径不一致（/api/llm-models -> /api/v1/llm-models）
3. llm-model.controller.test.ts: 更新 Zod v4 错误消息断言

## 测试用例分类

### 正向测试（Happy Path）
- GET /api/llm-models: sysadmin 获取模型列表
- GET /api/llm-models: 返回多条模型记录
- GET /api/llm-models: 处理所有 status 值
- GET /api/llm-models/enabled: sysadmin 获取已启用模型
- GET /api/llm-models/enabled: admin 获取已启用模型
- GET /api/llm-models/enabled: 返回多个已启用模型
- GET /api/llm-models/enabled: 仅选择 id/provider/model_name 字段
- GET /api/llm-models/:id: sysadmin 获取模型详情
- POST /api/llm-models: 创建模型成功
- POST /api/llm-models: 完整请求体传递给 service create
- POST /api/llm-models: 接受 http:// 协议的公共地址
- POST /api/llm-models: unicode 字符 model_name
- POST /api/llm-models: 有效公共 https URL 通过 SSRF 检查
- PUT /api/llm-models/:id: 更新模型成功
- PUT /api/llm-models/:id: 更新状态成功
- PUT /api/llm-models/:id: 更新多个字段
- PUT /api/llm-models/:id: 更新所有字段
- PUT /api/llm-models/:id: 更新成功消息验证
- PUT /api/llm-models/:id: boolean true status 通过
- PUT /api/llm-models/:id: 有效公共 https URL 更新成功
- DELETE /api/llm-models/:id: 删除模型成功（data=null）
- DELETE /api/llm-models/:id: 成功删除消息验证

### 边界条件测试
- GET /api/llm-models: 空列表
- GET /api/llm-models/enabled: 空列表
- GET /api/llm-models/:id: id=0/负数/浮点数/前导零/Infinity/NaN 均返回 400
- POST /api/llm-models: 所有必填字段缺失
- POST /api/llm-models: provider/base_url/api_key/model_name 各自缺失/空字符串
- POST /api/llm-models: provider/base_url/api_key/model_name 各自 null/非 string
- POST /api/llm-models: provider/base_url/api_key/model_name 超长
- POST /api/llm-models: provider/api_key/model_name 纯空格
- POST /api/llm-models: 拒绝额外字段（strict schema）
- PUT /api/llm-models/:id: 空 body
- PUT /api/llm-models/:id: 非 string provider/非 boolean status/超长字段
- PUT /api/llm-models/:id: 空 string provider/api_key/model_name/base_url
- DELETE /api/llm-models/:id: id=0/负数/浮点数/前导零/Infinity/NaN 均返回 400
- 不存在的模型返回 404
- 数据库错误返回 500 + 默认错误消息
- 错误无 message 时返回默认消息
- non-Error 类型异常返回默认消息

### 安全测试（SSRF 防护 - 重点覆盖）
- POST/PUT base_url SSRF 防护：拒绝 localhost
- POST/PUT base_url SSRF 防护：拒绝 127.x.x.x
- POST/PUT base_url SSRF 防护：拒绝 169.254.x.x（AWS 元数据）
- POST/PUT base_url SSRF 防护：拒绝 10.x.x.x（RFC 1918）
- POST/PUT base_url SSRF 防护：拒绝 192.168.x.x（RFC 1918）
- POST/PUT base_url SSRF 防护：拒绝 172.16.x.x ~ 172.31.x.x（RFC 1918）
- POST/PUT base_url SSRF 防护：拒绝 0.x.x.x
- POST/PUT base_url SSRF 防护：拒绝 IPv6 ::1（localhost）
- POST/PUT base_url SSRF 防护：拒绝 IPv6 fe80:（link-local）
- POST/PUT base_url SSRF 防护：拒绝 IPv6 fc00:（unique local）
- POST/PUT base_url SSRF 防护：拒绝 IPv6 fd 前缀
- POST base_url: 拒绝 ftp:// 协议
- POST base_url: 拒绝 javascript: 协议
- POST base_url: 拒绝 data: 协议
- POST base_url: 拒绝 file: 协议
- POST base_url: 拒绝含空格的 URL
- POST base_url: 拒绝畸形 URL
- PUT base_url: 拒绝 ftp:// 协议

### 权限测试
- GET /api/llm-models: admin/view 返回 403
- GET /api/llm-models/enabled: view 返回 403
- GET /api/llm-models/:id: admin/view 返回 403
- POST /api/llm-models: admin/view 返回 403
- PUT /api/llm-models/:id: admin/view 返回 403
- DELETE /api/llm-models/:id: admin/view 返回 403
- 所有端点无 token 返回 401
- 仅 sysadmin 角色可访问所有 LLM 模型操作
