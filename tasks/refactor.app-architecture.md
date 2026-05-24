# INF-013: app.ts 架构重构 — 路由模块化 + 异常层次结构 + 角色常量化

> 基于软件架构专家评审 `tasks/review/app.architecture.md` 的修复
> 完成日期：2026-05-24

---

## 功能说明

将 `apis/app.ts` 从"路由注册中心"重构为精简的 **Composition Root**，拆分 96 条路由到 12 个 Router 模块文件，引入 AppError 异常层次结构和角色常量。

## 评审问题与修复清单

### CRITICAL

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| C-1 | 96 条路由平铺在入口文件 | 拆分为 12 个 Router 模块文件到 `apis/routes/` | ✅ |
| C-2 | 中间件链重复 90+ 次 | Router 级中间件 + 路径限定 `router.use()` | ✅ |

### HIGH

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| H-1 | L187 注释与代码不匹配（"Knowledge Item" 实为 Todo） | 重构后注释已在新文件中正确标注 | ✅ |

### MEDIUM

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| M-1 | Swagger 无条件生成 | 延迟到条件判断内部 `require()` | ✅ |
| M-3 | 错误处理不分类 | AppError 基类 + 全局错误处理区分业务/系统错误 | ✅ |

### LOW

| 编号 | 问题 | 修复方案 | 状态 |
|------|------|----------|------|
| L-1 | 角色字符串硬编码 | `apis/constants/roles.ts` 定义 ROLES 常量 | ✅ |

## 新增文件

```
apis/
├── constants/roles.ts                    # 角色常量 ROLES (sysadmin/admin/view)
├── errors.ts                             # AppError 基类 + 业务异常子类（增强）
├── routes/
│   ├── auth.routes.ts                    # 认证路由（含 login 公共路由）
│   ├── company.routes.ts                 # 公司管理（sysadmin only）
│   ├── skills.routes.ts                  # 技能管理（sysadmin + admin）
│   ├── user.routes.ts                    # 用户管理（sysadmin only）
│   ├── llm-model.routes.ts               # LLM 模型管理
│   ├── system-config.routes.ts           # 系统配置（sysadmin only）
│   ├── publishing-platform.routes.ts     # 发布平台
│   ├── project.routes.ts                 # 项目管理（sysadmin + admin）
│   ├── article.routes.ts                 # 文章管理（路径限定中间件）
│   ├── knowledge.routes.ts               # 知识库+关键词+画像+图片+文档
│   ├── upload.routes.ts                  # 文件上传
│   ├── publishing-schedule.routes.ts     # 发布计划
│   └── todo.routes.ts                    # 待办事项
```

## 修改文件

- `apis/app.ts` — 从 239 行缩至 127 行，仅保留中间件链组装 + 路由模块挂载 + 全局错误处理
- `apis/errors.ts` — 新增 AppError 基类，现有异常类改为继承 AppError

## 架构改进指标

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| app.ts 行数 | 239 | 127 |
| 路由注册文件 | 1（app.ts） | 12（routes/*.routes.ts） |
| 中间件重复次数 | ~90 次 | 每路由模块 1 次 |
| 新增路由需修改文件 | app.ts（所有开发者） | 仅对应 routes 文件 |
| 合并冲突概率 | 极高（90+ 路由同一文件） | 极低（12 个独立文件） |
| 错误分类 | 无（全部 500） | AppError 层次结构 |

## 验收标准

- [x] `pnpm build:api` 通过
- [x] 所有 controller 测试通过（article, knowledge, auth, company, todo 等）
- [x] app.test.ts 156 个集成测试通过
- [x] 路由行为与重构前完全一致
- [x] H-1 注释错误已修正
- [x] M-1 Swagger 延迟加载
- [x] M-3 全局错误处理区分 AppError
- [x] L-1 角色常量化
