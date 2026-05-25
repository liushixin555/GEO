# article.controller.ts 架构评审修复 — 2026-05-25

## 评审来源
- `tasks/review/article.controller.ts.md` — 软件架构专家评审报告（B+）

## 修复项

### C-1: 状态机逻辑跨层分散 → 集中式完整状态机
- **文件**: `article.service.impl.ts`
- **修复**: STATUS_TRANSITIONS 从2个状态扩展到7个，覆盖所有合法状态转换
- **状态**: draft → generating/manual_writing, manual_writing → pending_review, generating → pending_review/generate_failed, generate_failed → generating, pending_review → publishing/manual_writing/draft/generating, publishing → published/publish_failed, publish_failed → publishing
- **新增**: 15个状态机完整性测试用例

### M-1: 缺少依赖注入 → 工厂模式
- **文件**: `article.controller.ts`, `service/index.ts`
- **修复**: 添加 `createArticleService()` 和 `createProjectService()` 工厂函数
- **效果**: Controller 通过工厂创建 Service 实例，支持测试时 mock 替换

### 服务测试签名同步
- **文件**: `tests/apis/article.service.test.ts`
- **修复**: 全面更新方法签名以匹配当前接口（projectId + AuthContext 对象）
- **修复**: 81个预存失败测试 → 0个失败

### 错误消息统一
- regenerate 错误消息统一为 `'文章当前状态不支持重新生成'`
- review 方法保留端点特定业务约束（仅 pending_review 可审核）

## 测试结果
- article 相关测试: 861/861 全通过（service 174 + controller 301 + entity/generation/schema 386）
- 全量测试: 10008 通过，38 失败（非 article 相关预存问题）
- TypeScript 编译: 通过
- ESLint: 0 errors

## 修改文件
- `apis/controller/article.controller.ts` — DI 工厂模式导入
- `apis/service/index.ts` — 新增 article/project 服务工厂函数
- `apis/service/impl/article.service.impl.ts` — 完整状态机 + review 端点约束
- `tests/apis/article.service.test.ts` — 全面重写对齐当前签名
- `tests/apis/article.controller.test.ts` — 错误消息同步
