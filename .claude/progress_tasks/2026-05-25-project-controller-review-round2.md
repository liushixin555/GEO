# project.controller.ts 评审修复第二轮 — LOW级别补全

**日期**: 2026-05-25
**文件**: `apis/controller/project.controller.ts`, `tests/apis/project.controller.test.ts`

## 评审报告

基于 `tasks/review/project.controller.md` 的16项评审结果：

### 已在之前commit中修复（P0-P2）
- C-1/C-2: RBAC view角色拦截（commit 1fec84b）
- C-3: req.body变异改为独立对象构造
- H-1: DI类型声明 `IProjectService`
- H-2: 使用 `created()` 工具函数
- H-3: parseInt 统一 radix=10 + 范围校验
- H-4: TOCTOU 下沉到 service 层
- H-5: deleteProject 统一权限检查
- M-1: err:unknown 安全窄化
- M-2: req.user 防御性检查
- M-3: status 严格解析
- M-4: admin company_id 逻辑修正
- M-5: search 长度限制100字符

### 本次修复（P3）
- **L-2**: 添加 logger 结构化日志记录（未预期错误）
- **L-1**: Swagger→Zod schema 已由中间件处理（无需改动）
- **L-3**: 字符串长度验证已由 Zod schema 中间件处理（无需改动）

### 额外改进
- **H-1 一致性**: 从 `new ProjectServiceImpl()` 改为 `createProjectService()` 工厂函数，与其他控制器保持一致
- 使用 barrel import `from '../service'` 替代直接路径导入

## 测试结果
- project controller: 212 passed（原206 + 新增6个logger测试）
- 全量 API 测试: 10039 passed（26 failed 来自无关的 rmapi.utils.test.ts）
- TypeScript 类型检查: 通过
- ESLint: 通过
- Build: 通过
