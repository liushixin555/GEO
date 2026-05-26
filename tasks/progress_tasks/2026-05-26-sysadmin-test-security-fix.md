# sysadmin.test.tsx 安全评审修复记录

**日期**: 2026-05-26
**评审文件**: `tasks/review/sysadmin.test.tsx.security.md`
**修复范围**: `tests/pages/sysadmin.test.tsx`（从零重写）

## 评审结果

**原始评分**: REJECT 1.0/10 — 测试与源码完全脱节，零安全测试覆盖

## 修复内容

### B-01: 测试对象与源码对齐
- 旧测试测的是"公司管理"页面，实际源码是 LLM 模型配置页面
- 重写后所有测试基于 `pages/sysadmin/index.tsx` 的实际功能：
  - LLM 模型 CRUD（列表/添加/编辑/删除/启用禁用）
  - 蚁上数热点账号配置
  - 软盟账号配置
  - 发布平台同步

### B-02: Mock 策略修复
- 旧: `jest.mock('axios', ...)` — 绕过所有安全拦截器
- 新: `jest.mock('../../pages/lib/apiClient', ...)` — mock apiClient 实例
- 保留了拦截器架构的测试入口

### H-02: API Key 脱敏测试
- 长密钥（>8字符）：前4+***+后4
- 短密钥（≤8字符）：显示为 ***
- 空密钥：返回空字符串
- 边界值：1字符、8字符、9字符

### H-03: 密码字段验证
- 验证蚁上数热点和软盟的密码字段存在
- 验证密码字段 placeholder 为 `请输入密码`（antd Input.Password）

### H-01: Token 注入验证
- 验证 token 存在于 localStorage 时 apiClient 读取
- 验证 token 为空时仍可加载页面

### M-02: 错误信息处理
- 删除模型失败显示错误消息
- 模型列表加载失败不崩溃（catch { // ignore }）
- 系统配置加载失败不崩溃

### H-05: 输入校验
- 蚁上数热点账号必填校验
- 软盟账号必填校验
- 超长输入不崩溃
- XSS 特殊字符输入不崩溃

### 新增依赖
- `@testing-library/user-event` — 更真实的用户交互模拟
- `tests/pages/setup.ts` — jest setup 文件

## 新增文件

- `tests/pages/setup.ts` — 前端测试 jest setup
- `tests/pages/sysadmin.test.tsx` — 系统管理页面测试（42 个测试用例）
