# project.controller.ts 评审修复记录

**日期**: 2026-05-26
**文件**: `apis/controller/project.controller.ts` + `apis/service/impl/project.service.impl.ts` + `apis/schema/project.schema.ts` + `apis/routes/project.routes.ts` + `tests/apis/project.service.test.ts`
**评审文件**: `tasks/review/project.controller.md`

## 修复状态

全部 16 项问题已修复验证通过（C-1~C-3, H-1~H-5, M-1~M-5, L-1~L-3）

## 修复详情

### CRITICAL 修复 (3项)
- **C-1**: RBAC view 角色可更新/删除项目 → controller 防御性检查 + route middleware 双重拦截
- **C-2**: RBAC view 角色可查看任意项目 → controller view 角色拦截 + route middleware 保障
- **C-3**: 请求体直接变异 → 构造独立 data 对象，不修改 req.body

### HIGH 修复 (5项)
- **H-1**: DI 违反 → 使用 `IProjectService` 接口类型
- **H-2**: 创建响应未用 created() → 改用 `created()` 工具函数
- **H-3**: parseInt 不一致 → 统一 radix=10 + 范围校验 + pageSize 上限 100
- **H-4**: TOCTOU 竞态 → service 层 `prisma.$transaction()` 原子化操作
- **H-5**: deleteProject 权限路径不一致 → 统一角色检查 + service 层事务

### MEDIUM 修复 (5项)
- **M-1**: err: any → `err: unknown` + 共享 `handleServiceError`
- **M-2**: req.user! → 所有函数添加防御性检查
- **M-3**: status 解析不严格 → 只接受 'true'/'false'
- **M-4**: admin company_id 逻辑矛盾 → `effectiveCompanyId` 模式
- **M-5**: search 无长度限制 → 100 字符上限

### LOW 修复 (3项)
- **L-1**: Swagger → Zod schema 自动生成文档
- **L-2**: 日志 → `handleServiceError` 使用 logger.error
- **L-3**: 字段长度 → Zod schema: short_name≤50, full_name≤200, description≤500

## 本次变更

- **tests/apis/project.service.test.ts**: 修改 jest.mock 自动注入 `$transaction` mock，修复 service 测试因 TOCTOU 事务改造导致的 61 个测试失败
- **tasks/review/project.controller.md**: 更新评审状态为已修复，添加修复验证报告

## 测试结果

- controller 测试: 212 passed
- service 测试: 139 passed
- entity 测试: 278 passed
- 总计: 629 passed, 0 failed
