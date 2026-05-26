# article.service.d.ts 五维评审修复

> 日期：2026-05-26
> 修复前评分：安全 3.9/10 + Committer 5.5/10 + 架构 5.2/10 + 质量 6.8/10
> 预期修复后评分：8.0/10+

## 修复内容

### CRITICAL 修复
1. **IDOR (C1)**: `getById(projectId, id)` 和 `listVersions(projectId, articleId)` 添加 projectId 校验
2. **Auth必填 (C2)**: `list()` 方法 auth 参数从可选改为必填，参数位置前移到 search/status 之前

### HIGH 修复
3. **Role类型 (C3)**: `AuthContext.role` 从 `string` 改为 `Role = 'sysadmin' | 'admin' | 'view'` 联合类型
4. **AuthContext统一 (H1-H4)**: 创建 `apis/types/auth.ts` 作为 AuthContext 唯一定义源
5. **认证模式一致**: 所有控制器通过 `role as Role` 统一转换

### 文件变更
- `apis/types/auth.ts` — 新建 AuthContext 定义
- `apis/constants/roles.ts` — 新建 Role 联合类型
- `apis/service/article.service.ts` — 接口签名修复
- `apis/service/impl/article.service.impl.ts` — 实现全部接口变更
- `apis/controller/article.controller.ts` — 调用签名适配
- `apis/controller/publishing-schedule.controller.ts` — 调用签名适配
- `apis/controller/system-config.controller.ts` — AuthContext 适配
- `apis/entity/publishing-schedule.entity.ts` — 类型安全修复
- `tests/apis/article.service.test.ts` — 260 测试适配
- `tests/apis/publishing-schedule.service.test.ts` — 94 测试适配
- `tests/apis/publishing-schedule.controller.test.ts` — 3 测试参数顺序修复

## 设计决策
- 发布计划方法（listPublishingSchedule/updateSchedule/rejectPublish）保留在独立 IPublishingScheduleService，因为 Prisma Article 模型不包含 platforms/scheduledPublishAt/scheduleType 字段
- AuthContext 统一提取到 `apis/types/auth.ts`，但保持从 `article.service.ts` re-export 以兼容现有消费者
