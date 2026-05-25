# apis/controller/skills.controller.ts — Committer 审核专家评审报告（v2 重审）

**评审日期**: 2026-05-25
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/controller/skills.controller.ts`
**代码行数**: 167 行（5 个导出函数 + 1 个中间件函数 + 1 个辅助函数 + 1 个 multer 懒初始化）
**测试文件**: `tests/apis/skills.controller.test.ts`（1729 行）+ `tests/apis/skills.round2.controller.test.ts`（1245 行），合计 ~160 个测试用例
**关联文件**: `apis/service/impl/skills.service.impl.ts`（83 行）、`apis/service/skills-file.service.ts`（166 行）、`apis/entity/errors.ts`（NotFoundError/ConflictError/BusinessError）、`apis/routes/skills.routes.ts`（15 行）
**已有评审**: 质量评审（skills.controller.md）、架构评审（skills.controller.architecture.md）、安全评审（skills.controller.security.md）、v1 Committer 评审（本文件上一版）
**评审基线**: dev 分支，代码已根据 v1 评审的 P0/P1 修复建议完成重构

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，本文件经历了**重大重构**，从 v1 评审时的 229 行精简至 167 行，核心变化为：

1. **文件操作职责完全下沉至 `SkillsFileServiceImpl`**（架构 ARCH-CRITICAL-1 修复）
2. **攻击链已彻底切断**（字段白名单 + 路径验证双保险）
3. **错误处理体系升级**（自定义异常 + `handleSkillError` 辅助函数）
4. **测试覆盖大幅扩充**（从 74 个用例增至 ~160 个用例）

**核心结论**: v1 Committer 评审标记的全部 P0 和 P1 问题均已修复，v1 标记的 6 个"退步"项全部纠正。代码质量已从"有条件通过"提升至"可合并"水平。

| 审核维度 | v1 评分 | v2 评分 | 变化 | 判定 |
|----------|---------|---------|------|------|
| 功能完整性 | 9/10 | 9/10 | 持平 | 通过 — 5 端点 CRUD + zip 上传，文件操作下沉至 FileService |
| 测试完备性 | 8/10 | 9/10 | ↑ | 通过 — ~160 用例，覆盖 service/file/error-handler/边界值 |
| API 契约正确性 | 7/10 | 9/10 | ↑↑ | 通过 — `created()` 统一、RESTful 规范、路由拆分至 routes.ts |
| 项目规范遵循 | 6/10 | 9/10 | ↑↑ | 通过 — 分层正确、err:unknown、字段白名单、pageSize 上限 |
| 生产就绪度 | 5/10 | 8/10 | ↑↑ | 通过 — 攻击链已断、回滚机制、路径预校验、DB 先删后删文件 |
| 向后兼容性 | 10/10 | 10/10 | 持平 | 通过 — 新模块，无兼容性问题 |

**综合判定: 通过（APPROVE）**

---

## 二、v1 评审问题修复验证

### 2.1 P0 级修复验证

| v1 问题 | 修复状态 | 验证证据 |
|---------|---------|---------|
| updateSkills 无字段白名单（攻击链入口） | **已修复** | 第 127 行 `const { name, description } = req.body` — 仅解构 name 和 description，skill_dir 等字段不可被篡改 |
| deleteSkills 路径未验证（攻击链出口） | **已修复** | 第 151 行 `skillsFileService.validateSkillDirPath(skillDir)` — 调用 FileService 的 `resolved.startsWith` 检查 |

### 2.2 P1 级修复验证

| v1 问题 | 修复状态 | 验证证据 |
|---------|---------|---------|
| 创建失败无回滚 | **已修复** | 第 102-104 行 catch 中 `fs.rmSync(extractedSkillDir, { recursive: true, force: true })` 清理已解压目录 |
| createSkills 响应格式不一致 | **已修复** | 第 99 行使用 `created(res, item, '技能创建成功')` — 不再手动构造 201 响应 |
| pageSize 无上限 | **已修复** | 第 58 行 `Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) \|\| 10))` |
| err: any → err: unknown | **已修复** | 所有 catch 块使用 `err: unknown`，通过 `handleSkillError` 辅助函数统一处理 |
| deleteSkills 路径未验证 | **已修复** | 第 151 行预校验 + FileService 层双重路径检查 |
| req.user! 非空断言 | **已修复** | 第 85 行 `if (!req.user)` 空值检查 + 第 121/142 行 `req.user?.role` 可选链 |

### 2.3 P2 级修复验证

| v1 问题 | 修复状态 | 验证证据 |
|---------|---------|---------|
| Zip Slip extractAllTo 改逐条提取 | **已修复** | FileService 第 95-116 行逐条 `entry.getData()` + `writeFileSync`，不再使用 extractAllTo |
| Zip Bomb 总大小限制 | **已修复** | FileService 第 7 行 `MAX_TOTAL_EXTRACTED_SIZE = 500MB` + 第 110-112 行累计大小检查 |
| 409 Conflict 正确映射 | **已修复** | `handleSkillError` 辅助函数第 35-36 行 `instanceof ConflictError → 409`，Service 层抛出 `ConflictError` |
| Controller 文件操作越权 | **已修复** | 抽取 `SkillsFileServiceImpl`，Controller 仅通过接口调用 `extractSkillZip`/`validateSkillDirPath`/`removeSkillDir` |

### 2.4 v1 评审"退步"项修复验证

| v1 退步项 | 修复状态 | 验证证据 |
|-----------|---------|---------|
| catch 类型 err:any → err:unknown | **已修复** | 全部 5 个 catch 块使用 `err: unknown` |
| 错误信息泄露 err.message | **已修复** | `handleSkillError` 对 unknown 类型返回通用消息，不泄露内部信息 |
| req.user 非空断言 | **已修复** | 使用 `req.user?.role` 可选链 + `if (!req.user)` 空值检查 |
| create 响应格式不一致 | **已修复** | 使用 `created()` 工具函数 |
| pageSize 无上限 | **已修复** | `Math.min(100, ...)` |
| update 无字段白名单 | **已修复** | 解构仅取 name、description |

**v1 标记的全部 6 个 P0/P1 问题 + 6 个"退步"项 = 12 项已全部修复。**

---

## 三、代码质量审核

### 3.1 架构合规性

| 检查项 | v1 状态 | v2 状态 | 说明 |
|--------|---------|---------|------|
| Controller 不直接操作文件系统 | 越权 80 行 | **仅 3 行委托调用** | `extractSkillZip`/`validateSkillDirPath`/`removeSkillDir` |
| Controller 函数行数 < 50 行 | createSkills ~80 行 | **全部 < 35 行** | createSkills 32 行（第 80-112 行） |
| Service 层分离 | 未通过 | **通过** | FileService 独立文件 166 行 |
| 错误传播使用自定义异常 | 字符串匹配 | **通过** | NotFoundError/ConflictError/BusinessError |
| 路由注册分离 | app.ts 内联 | **通过** | 独立 `skills.routes.ts`（15 行） |

**Committer 评价**: 架构合规性从 v1 的 3/10 提升至 8/10。Controller 现在仅负责 HTTP 协议适配、参数提取、权限校验和响应构造，文件操作完全委托给 `SkillsFileServiceImpl`。

### 3.2 错误处理审核

**`handleSkillError` 辅助函数（第 32-42 行）**:

```
NotFoundError  → 404    ✓ 正确
ConflictError  → 409    ✓ 正确（v1 缺失，现已修复）
BusinessError  → 400    ✓ 正确
其他           → 500 + 通用消息  ✓ 安全（不泄露内部信息）
```

**Committer 评价**: 这是项目中**首个使用自定义异常 + 辅助函数**实现结构化错误处理的 Controller，值得在项目中推广。

### 3.3 安全防御审核

| 防御层 | 实现 | 评价 |
|--------|------|------|
| JWT 认证 | `authMiddleware` 全路由 | 通过 |
| 角色限制 | `roleMiddleware(sysadmin, admin)` | 通过 |
| 文件类型过滤 | multer fileFilter `.zip` + mimetype | 通过 |
| 文件大小限制 | multer `50MB` | 通过 |
| Zip Slip 防护 | FileService 逐条 `path.resolve` + `startsWith` | 通过 |
| Zip Bomb 防护 | FileService 单条 100MB + 总计 500MB | 通过 |
| 路径遍历防护 | FileService `validateSkillDirPath` + `removeSkillDir` | 通过 |
| 字段白名单 | updateSkills 解构仅取 name/description | 通过 |
| 权限校验 | update/delete 仅创建者或 sysadmin | 通过 |
| 临时文件清理 | createSkills finally 块 | 通过 |
| 解压目录回滚 | createSkills catch 块 | 通过 |
| 软删除优先 | deleteSkills DB 先删 → 文件后删 | 通过 |
| 路径预校验 | deleteSkills 在状态变更前验证路径 | 通过 |

**攻击链验证**:

```
v1 攻击路径:
  Step 1: PUT /api/skills/1 { "skill_dir": "../../etc" }
    → v1: req.body 整体传入 Service，skill_dir 可被篡改
    → v2: 仅解构 { name, description }，skill_dir 字段被忽略 ✓ 阻断

  Step 2: DELETE /api/skills/1
    → v1: 直接 path.join + fs.rmSync，无路径校验
    → v2: validateSkillDirPath() + startsWith 检查 ✓ 阻断
```

**Committer 判定**: 攻击链已**双重阻断**，即使绕过 Step 1 的白名单（理论上不可能），Step 2 的路径验证仍会拦截非法路径。

### 3.4 代码简洁性审核

| 指标 | v1 | v2 | 变化 |
|------|----|----|------|
| 总行数 | 229 | 167 | -62 行（-27%） |
| 文件操作行数 | ~80 行 | 0 行（委托） | -80 行 |
| 辅助函数 | 0 | 1（handleSkillError） | 复用 5 个 catch 块 |
| multer 配置 | 内联 | 懒初始化 | 更安全（不触发模块级副作用） |
| 路由注册 | app.ts 内联 | routes.ts 独立文件 | 更模块化 |

---

## 四、测试完备性审核

### 4.1 测试规模

| 测试文件 | 行数 | 测试用例数 | 覆盖目标 |
|----------|------|-----------|---------|
| skills.controller.test.ts | 1729 | ~80 | Controller 端点集成测试 |
| skills.round2.controller.test.ts | 1245 | ~80 | Service/FileService/parseSkillMd 单元 + Controller 补充 |
| **合计** | **2974** | **~160** | 全面覆盖 |

### 4.2 第二轮测试亮点

`skills.round2.controller.test.ts` 补充了 v1 Committer 评审标记的测试盲区：

| 第二轮新增测试 | 覆盖内容 | v1 盲区修复 |
|---------------|---------|------------|
| SkillsServiceImpl 单元测试 | create/update/delete/list/getById 分支覆盖 | 补全 Service 层独立测试 |
| SkillsFileServiceImpl 单元测试 | extractSkillZip/getSkillsDir/getTmpDir/validateSkillDirPath/removeSkillDir | 补全 FileService 层测试 |
| parseSkillMd 单元测试 | frontmatter 解析边界 | 补全工具函数测试 |
| PUT 空请求体 | `{}` body 不报错 | 边界值补充 |
| DELETE ConflictError | handleSkillError 错误类型分发 | 错误路径覆盖 |
| PUT ConflictError/BusinessError | 各错误类型 HTTP 状态码 | 错误路径覆盖 |
| GET non-Error throw | unknown 错误类型回退 500 | 防御性测试 |
| handleSkillError 各错误类型 | NotFoundError/ConflictError/BusinessError/unknown | 辅助函数完整覆盖 |
| mapSkills 边界字段 | null/undefined 字段映射 | 映射层覆盖 |
| 列表分页边界 | page/pageSize 极端值 | 边界值补充 |
| SKILL.md 边界 | 空 frontmatter/无 description | 解析边界覆盖 |
| 上传中间件 multer Error | 文件过大/格式错误 | 中间件错误处理 |
| 并行查询验证 | list 接口 Promise.all 行为 | 并发行为验证 |
| 排序验证 | list 接口 orderBy 行为 | 排序行为验证 |
| 鉴权边界 | update/delete 非创建者非 sysadmin | 权限边界补充 |

### 4.3 测试覆盖率评价

| 层 | 测试文件 | 预估覆盖率 |
|----|---------|-----------|
| Controller (167 行) | skills.controller.test.ts | ~92% |
| FileService (166 行) | skills.round2.controller.test.ts | ~95% |
| Service (83 行) | skills.round2.controller.test.ts | ~95% |
| parseSkillMd | skills.round2.controller.test.ts | ~95% |

**预估总行覆盖率: ~93%**，远超项目 80% 最低要求，在项目中属于**最高水平**。

---

## 五、API 契约正确性审核

### 5.1 路由注册一致性

**skills.routes.ts 路由定义**:

```
GET    /           → listSkills
GET    /:id        → getSkills
POST   /           → uploadSkillMiddleware → createSkills
PUT    /:id        → updateSkills
DELETE /:id        → deleteSkills
```

路由文件使用 `router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN))` 统一中间件链。

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 路由独立文件 | 通过 | 拆分至 `apis/routes/skills.routes.ts` |
| 中间件链完整 | 5/5 通过 | 全部使用 auth + role 中间件 |
| HTTP 方法正确 | 5/5 通过 | GET/POST/PUT/DELETE 语义正确 |
| POST 中间件 | 通过 | uploadSkillMiddleware 前置 |
| Controller 导出匹配 | 6/6 通过 | 6 个导出函数均有路由或中间件绑定 |
| ROLES 常量 | 通过 | 使用 `ROLES.SYSADMIN/ADMIN` 替代硬编码字符串 |

### 5.2 响应格式一致性

| 端点 | 状态码 | 工具函数 | 一致性 |
|------|--------|---------|--------|
| list | 200 | `paginate()` | ✓ |
| get | 200 | `success()` | ✓ |
| **create** | **201** | **`created()`** | **✓ v1 不一致，已修复** |
| update | 200 | `success()` | ✓ |
| delete | 200 | `success()` | ✓ |

**全部 5 端点响应格式统一，v1 的 create 手动构造问题已修复。**

---

## 六、残留问题与改进建议

### 6.1 非阻塞性建议（后续迭代）

| 优先级 | 问题 | 说明 | 建议 |
|--------|------|------|------|
| P2 | multer 懒初始化仅限单实例 | `getUpload()` 返回单例，多实例部署时 tmp 目录竞争 | 生产环境使用 Redis/对象存储 |
| P2 | createSkills 解压目录回滚使用 `fs.rmSync` | 同步文件删除在高并发场景下可能阻塞事件循环 | 考虑异步 `fs.rm` |
| P3 | 软删除后目录不可恢复 | delete 先软删 DB 再删目录，DB 可恢复但目录不可逆 | 考虑目录归档而非删除 |
| P3 | `req.user` 类型由中间件扩展 | `req.user` 隐式依赖 authMiddleware 的 JWT 解析结果 | 项目级模式，非阻塞 |
| OBS | listSkills 无排序参数 | 固定 `orderBy: { id: 'desc' }` | 当前业务足够，后续可扩展 |

### 6.2 v1 P3 级技术债务跟进

| v1 问题 | 当前状态 | 说明 |
|---------|---------|------|
| 双写无事务边界 | 部分缓解 | delete 先软删 DB 再删文件（先可逆后不可逆），但创建仍无完整事务 |
| 硬编码单例 | 持平 | `new SkillsServiceImpl()` / `new SkillsFileServiceImpl()` 模块级实例化，与项目统一 |
| parseSkillMd 独立性 | 已修复 | 已位于 `apis/utils/skill-md.util.ts`，有独立单元测试 |

---

## 七、代码亮点（正面评价）

| 亮点 | 说明 | 推广价值 |
|------|------|---------|
| `handleSkillError` 辅助函数 | 首个使用自定义异常分发 HTTP 状态码的 Controller | **全项目推广** — 消除 catch 块重复代码 |
| `SkillsFileServiceImpl` 抽取 | 文件操作完全解耦，Controller 仅 ~30 行 HTTP 适配 | 架构最佳实践范例 |
| 逐条解压 + 路径校验 | Zip Slip/Bomb 双重防护 | 文件上传模块标准模式 |
| 创建回滚 + 临时文件清理 | catch + finally 双层保障 | 事务补偿模式范例 |
| 删除操作两步走 + 路径预校验 | 先软删 DB（可逆）→ 再删文件（不可逆），路径预校验在状态变更前 | 安全删除操作标准 |
| 懒初始化 multer | `getUpload()` 延迟创建，避免模块级副作用 | 启动时性能优化 |
| `err: unknown` + 自定义异常 | 类型安全的错误处理 + 结构化异常传播 | TypeScript 最佳实践 |
| 路由独立文件 | `skills.routes.ts` 与 app.ts 解耦 | 路由模块化标准 |
| 第二轮测试补全 | 针对 FileService/parseSkillMd/handleSkillError 独立单元测试 | 测试分层覆盖标准 |

---

## 八、最终裁决

### 裁决结果: 通过（APPROVE）

**裁决依据**:

1. **v1 全部阻塞性问题已修复**: P0 攻击链（字段白名单 + 路径验证）、P1 问题（回滚、响应格式、pageSize 上限、err 类型、req.user 保护）共 12 项全部修复
2. **架构显著改善**: Controller 从 229 行精简至 167 行，文件操作下沉至独立的 `SkillsFileServiceImpl`，分层职责清晰
3. **测试覆盖优秀**: ~160 个测试用例，预估覆盖率 ~93%，覆盖 Controller/FileService/Service/parseSkillMd 四层
4. **安全防御完备**: JWT + 角色限制 + 字段白名单 + 路径验证 + Zip Slip/Bomb 防护 + 回滚机制 + 路径预校验
5. **代码质量项目中最高水平**: `handleSkillError` + 自定义异常 + `err: unknown` + `created()` + 路由独立文件 + 懒初始化
6. **无向后兼容性问题**: 新模块，不涉及已有接口变更

**与 v1 裁决对比**:

| 维度 | v1 裁决 | v2 裁决 |
|------|---------|---------|
| 综合判定 | CONDITIONAL APPROVE | **APPROVE** |
| P0 问题 | 1 个（攻击链入口） | **0 个** |
| P1 问题 | 5 个 | **0 个** |
| 生产就绪度 | 5/10 | **8/10** |
| 项目规范遵循 | 6/10 | **9/10** |

**合并操作建议**:

- 可直接合并到 dev 分支，无需附带条件
- 合并后建议运行完整测试套件确认无回归
- `handleSkillError` 模式值得在项目其他 Controller 中推广
- 生产环境部署后对 skills API 添加访问审计日志

---

## 九、对已有评审报告的交叉确认

| 评审来源 | v1 核心发现 | v2 修复状态 | Committer 确认 |
|----------|------------|------------|---------------|
| 质量评审 C-1 | 创建失败无回滚 | 已修复（catch 清理 extractedSkillDir） | ✓ |
| 质量评审 C-2 | Zip Slip extractAllTo 绕过 | 已修复（逐条提取 + writeFileSync） | ✓ |
| 质量评审 H-1 | createSkills 响应格式不一致 | 已修复（使用 created()） | ✓ |
| 质量评审 H-2 | updateSkills 无字段白名单 | 已修复（解构仅取 name/description） | ✓ |
| 质量评审 H-3 | deleteSkills 路径未验证 | 已修复（validateSkillDirPath） | ✓ |
| 质量评审 H-4 | catch err:any | 已修复（err:unknown + handleSkillError） | ✓ |
| 架构评审 AC-1 | Controller 文件操作越权 | 已修复（SkillsFileServiceImpl 抽取） | ✓ |
| 架构评审 AC-2 | 双写无事务边界 | 部分缓解（先软删后删文件 + 路径预校验） | 可接受 |
| 架构评审 AM-2 | 字符串异常匹配 | 已修复（自定义异常 + handleSkillError） | ✓ |
| 架构评审 AM-3 | update 无字段白名单 | 已修复（解构白名单） | ✓ |
| 安全评审 C-1 | Zip Slip | 已修复（逐条提取） | ✓ |
| 安全评审 C-2 | Zip Bomb 无总大小限制 | 已修复（500MB 总量限制） | ✓ |
| 安全评审 C-3 | 创建失败无清理 | 已修复（catch + finally 双层清理） | ✓ |
| 安全评审 C-4 | ReDoS 风险 | 已修复（FileService 使用 js-yaml） | ✓ |
| 安全评审 H-1 | update 无字段白名单 | 已修复 | ✓ |
| 安全评审 H-2 | delete 路径未验证 | 已修复 | ✓ |
| 安全评审 H-3 | req.user! 非空断言 | 已修复（可选链 + 空值检查） | ✓ |
| 安全评审 H-5 | 错误信息泄露 | 已修复（handleSkillError 通用消息） | ✓ |
| 安全评审 M-2 | pageSize 无上限 | 已修复（Math.min(100, ...)） | ✓ |

**三份评审报告共标记的 19 个问题中，18 个已完全修复，1 个（双写事务边界）部分缓解。修复率 95%。**

---

*Committer 审核专家评审完成（v2 重审）— 2026-05-25*
