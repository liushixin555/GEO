# MEMORY.md

## 安全评审

- [system-config-security-v2](system-config-security-v2.md) — system-config.controller.ts 安全评审v2：PUT响应仍明文回显密码，白名单双重定义漂移风险
- [todo-controller-security-v2](todo-controller-security-v2.md) — todo.controller.ts 安全评审v2：前轮CRITICAL/HIGH全修复，新发现createTodo跨公司归属+写操作缺公司边界
- [service-index-security-review](service-index-security-review.md) — apis/service/index.ts 安全评审 2.4/10 REJECT：实现类暴露+工厂覆盖率29%+67%消费者绕过barrel
- [dragbar-security-review](dragbar-security-review.md) — DragBar/index.tsx 安全评审 7.1/10：事件监听器泄漏+无节流DoS+NaN边界检查失效
- [user-index-security](user-index-security.md) — pages/user/index.tsx 安全评审 5.8/10：空catch吞错误+搜索无防抖DoS+状态切换竞态+前端权限依赖localStorage

## 架构评审

- [knowledge-base-entity-arch-review](knowledge-base-entity-arch-review.md) — knowledge-base.entity.ts 架构评审 4.1/10 REQUEST CHANGES：三职责混合+判别联合缺失+deleted_at遗漏+any映射
- [todo-controller-arch-review-v2](todo-controller-arch-review-v2.md) — todo.controller.ts 架构评审v2：前轮CRITICAL全修复，新发现双重验证+company_id归属问题
- [review-user-index-arch](review-user-index-arch.md) — pages/user/index.tsx 架构评审 4.5/10：认证双数据源+数据层缺失+类型四重定义+双视图冗余渲染
- [service-index-arch-review](service-index-arch-review.md) — apis/service/index.ts 架构评审 3.3/10 CRITICAL：Barrel封装破损+三种消费模式+工厂函数不完整

## Committer 评审

- [todo-controller-committer-v2](todo-controller-committer-v2.md) — todo.controller.ts Committer评审v2：APPROVE通过，v1全部8项安全问题修复完成
- [dragbar-committer-review](dragbar-committer-review.md) — DragBar/index.tsx Committer评审 5.2/10：CONDITIONAL APPROVE，闭包陈旧+事件泄漏在当前场景不触发，建议CSS覆盖触控目标
- [service-index-committer-review](service-index-committer-review.md) — apis/service/index.ts Committer评审 2.9/10 REJECT：实现类暴露+36%服务未导出+SystemConfig无AuthContext
- [user-index-committer-review](user-index-committer-review.md) — pages/user/index.tsx Committer审核 4.9/10 REQUEST CHANGES：原生table违反铁律+空catch吞错误+搜索无防抖DoS

## 质量评审

- [review-dragbar-quality](review-dragbar-quality.md) — DragBar/index.tsx 质量评审 6.2/10：闭包陈旧+重复计算+可访问性缺失
- [review-user-index-quality](review-user-index-quality.md) — pages/user/index.tsx 质量评审 6.4/10：搜索无防抖+竞态条件+空catch+类型重复
- [service-index-quality-review](service-index-quality-review.md) — apis/service/index.ts 质量评审 3.1/10：遗漏4个服务导出+工厂函数不一致+冗余import
- [swagger-index-quality-review](swagger-index-quality-review.md) — pages/swagger/index.tsx 质量评审 6.5/10 CONDITIONAL APPROVE：Space orientation+Card borderless+res.ok修复
- [knowledge-base-entity-quality](knowledge-base-entity-quality.md) — knowledge-base.entity.ts 质量评审 4.2/10：scope类型重复+deleted_at遗漏+nullability不一致+聚合计数字段未区分

## UI评审

- [review-dragbar-ui](review-dragbar-ui.md) — DragBar/index.tsx UI评审 2.8/10：触控目标不达标+圆角/间距违规+零可访问性+零视觉反馈
- [user-index-ui-review](user-index-ui-review.md) — pages/user/index.tsx UI评审 4.0/10：原生table违反铁律+搜索无防抖+双渲染+无确认+无Tooltip+无Skeleton

## 评审修复

- [user-index-review-fix](user-index-review-fix.md) — pages/user/index.tsx 评审修复完成：3项BLOCKING+4项HIGH+4项MEDIUM已修复，预期评分7.0/10
- [service-index-review-fix](service-index-review-fix.md) — apis/service/index.ts 评审修复完成：移除实现类导出+补全14服务工厂+迁移全部消费者+SystemConfig添加AuthContext
- [sidebar-review-fix](sidebar-review-fix.md) — Sidebar.tsx 五维评审修复完成：view越权阻断+路径匹配+触控目标+AuthContext信任链，预期8.0/10

## 测试架构评审

- [knowledge-service-r2-test-arch](knowledge-service-r2-test-arch.md) — knowledge.service.r2.test.ts 架构评审 5.2/10 CONDITIONAL APPROVE：Mock劫持掩盖硬编码依赖+12接口方法零测试+Raw SQL/ORM双模式映射一致性无保护

## 测试质量评审

- [knowledge-service-r2-test-quality](knowledge-service-r2-test-quality.md) — knowledge.service.r2.test.ts 质量评审 4.5/10：零错误路径+search分支空白+8方法零覆盖，分支覆盖仅29.72%

## 测试安全评审

- [knowledge-service-r2-test-security](knowledge-service-r2-test-security.md) — knowledge.service.r2.test.ts 安全评审 3.8/10 REJECT：Raw SQL注入零验证+checkDuplicate守门零测试+事务原子性零测试+恶意输入零测试+URL SSRF零测试

## 测试Committer评审

- [knowledge-service-r2-test-committer](knowledge-service-r2-test-committer.md) — knowledge.service.r2.test.ts Committer评审 REJECT：零错误路径+12方法零覆盖+Raw SQL安全零验证，三份评审一致阻断

## 测试评审修复

- [knowledge-service-r2-review-fix](knowledge-service-r2-review-fix.md) — knowledge.service.r2.test.ts 评审修复完成：4份评审BLOCKING/HIGH全部修复，32→85测试，Branch 29.72→90.54%

## 前端组件评审

- [sidebar-quality-review](sidebar-quality-review.md) — Sidebar.tsx 质量评审 7.2/10：view角色越界+触控目标16px+路径前缀匹配脆弱
- [sidebar-arch-review](sidebar-arch-review.md) — Sidebar.tsx 架构评审 6.8/10：view角色越界+路径前缀匹配脆弱+菜单配置耦合
- [sidebar-security-review](sidebar-security-review.md) — Sidebar.tsx 安全评审 6.2/10：view角色越权访问发布管理+AuthContext localStorage回退信任链+路由守卫默认重定向到/publish
- [sidebar-ui-review](sidebar-ui-review.md) — Sidebar.tsx UI评审 5.5/10：折叠按钮16×16px触控目标严重不足+折叠态footer功能退化+footer字号不匹配DESIGN.md Token+view角色越权菜单
- [sidebar-committer-review](sidebar-committer-review.md) — Sidebar.tsx Committer评审 CONDITIONAL APPROVE：view角色越权是唯一阻断项，修复后可达8.0/10
