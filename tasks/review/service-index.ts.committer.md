# apis/service/index.ts — Committer 审核专家评审

**评审角色**: Committer 审核专家（合并准入裁决）
**评审日期**: 2026-05-26
**文件**: `apis/service/index.ts`（48 行）
**评审范围**: 综合安全评审、架构评审、质量评审三方结论，做出合并准入裁决

---

## 前序评审结论

| 评审维度 | 评分 | 结论 | 文件 |
|----------|------|------|------|
| 安全评审 | 2.4/10 | REJECT | service-index.ts.security.md |
| 架构评审 | 3.3/10 | REJECT | service-index.ts.architecture.md |
| 质量评审 | 3.1/10 | CONDITIONAL APPROVE | service-index.ts.quality.md |

**三方一致**：均给出 REJECT 或 CONDITIONAL APPROVE，且均标记 CRITICAL 级别问题。

---

## 综合评分

| 维度 | 评分 | 等级 |
|------|------|------|
| 安全准入 | 2.4/10 | CRITICAL |
| 架构准入 | 3.3/10 | CRITICAL |
| 质量准入 | 3.1/10 | CRITICAL |
| **Committer 综合** | **2.9/10** | **REJECT** |

---

## 阻塞合并项（P0 — 必须修复）

### P0-1. 实现类全部暴露，安全边界完全失效 [CRITICAL]

**来源**: 安全评审 S-1

index.ts 同时导出 10 个实现类（`XxxServiceImpl`），任何消费者可直接 `new` 绕过工厂函数。涉及 3 个安全敏感度"极高"的服务：

- `AuthServiceImpl` — 密码验证流程
- `UserServiceImpl` — 用户 CRUD + 密码操作
- `SystemConfigServiceImpl` — 系统配置读写，无 AuthContext

**Committer 判定**: 实现类导出破坏了 barrel 文件作为安全边界的根本目的。即使当前工厂函数无安全检查，保留实现类导出意味着未来无法在 barrel 层添加任何安全拦截。**阻塞合并。**

**修复要求**: 移除所有 `export { XxxServiceImpl }` 行，仅导出接口和工厂函数。

---

### P0-2. 36% 服务未纳入 barrel，消费者穿透内部路径 [CRITICAL]

**来源**: 架构评审 A-1 + 安全评审 S-3

4 个服务模块（knowledge、knowledge-base、llm、skills-file）完全未导出，6 个 controller 直接穿透到 `service/impl/` 路径。总计 14 个服务中，仅 10 个导出接口、仅 4 个有工厂函数。

**消费者穿透统计**:

| 消费模式 | 文件数 | 占比 |
|----------|--------|------|
| 通过 barrel 工厂函数 | 6 | 40% |
| 直接 `new` 实现（绕过 barrel） | 9 | 60% |

**Committer 判定**: barrel 文件存在的意义是提供统一入口。60% 的消费者绕过 barrel 意味着该文件形同虚设。这不是风格问题，是架构功能性问题——无法在 barrel 层添加横切关注点。**阻塞合并。**

**修复要求**: 补全遗漏的 4 个服务导出 + 工厂函数，并迁移现有消费者到 barrel 路径。

---

### P0-3. 安全敏感服务无 AuthContext，可被任意调用 [CRITICAL]

**来源**: 安全评审 S-6

`SystemConfigServiceImpl` 的接口方法不接收 `AuthContext` 参数，Controller 直接 `new` 实例化。`getAll()` 返回所有系统配置（含敏感项），`batchUpdate()` 可修改任意配置，Service 层无法执行权限校验。

**Committer 判定**: 系统配置服务是最敏感的模块之一，允许无认证读写是严重安全漏洞。**阻塞合并。**

**修复要求**: `ISystemConfigService` 接口添加 `AuthContext` 参数，Controller 通过 barrel 工厂获取服务并传递认证上下文。

---

## 不阻塞合并但必须跟进（P1 — 本迭代内修复）

### P1-1. 工厂函数覆盖率 29%，10 个服务缺少工厂函数 [HIGH]

**来源**: 安全评审 S-2 + 架构评审 A-3

14 个服务仅 4 个有工厂函数（29%）。剩余 10 个消费者被迫直接实例化实现类。

**Committer 判定**: 作为 P0-1/P0-2 修复的一部分自然解决——移除实现类导出后，必须为所有服务添加工厂函数。**随 P0 同步修复。**

---

### P1-2. 三种消费模式并存，抽象层失效 [HIGH]

**来源**: 架构评审 A-2

- 模式 A: 工厂函数 via barrel（6 个 controller）
- 模式 B: 直接 `new` 实现（6 个 controller）
- 模式 C: 接口从 barrel，实现从 impl 混合穿透（2 个 controller + 1 个 scheduler）

**Committer 判定**: 随 P0-2 迁移消费者时统一为模式 A。**本迭代内完成。**

---

### P1-3. Scheduler 绕过全部安全层 [HIGH]

**来源**: 安全评审 S-8

`article-generation.scheduler.ts` 直接 `new LlmServiceImpl()`，绕过 barrel、auth middleware、rate limiter、audit logger。如果 LLM 服务调用外部 API 含 API Key，此路径完全无审计。

**Committer 判定**: 定时任务虽然无 HTTP 请求上下文，但仍应通过 barrel 获取服务以保留审计能力。**本迭代内迁移。**

---

### P1-4. AuthContext 双路径导出 [HIGH]

**来源**: 安全评审 S-5

barrel 以 `ArticleAuthContext` 别名导出，但 consumer 直接从源文件导入 `AuthContext`。两路径并存导致类型治理混乱。

**Committer 判定**: 统一为单一导出路径。**本迭代内完成。**

---

## 建议改进（P2 — 下一迭代）

### P2-1. 冗余 import + export from 反模式 [MEDIUM]

**来源**: 架构评审 A-4 + 质量评审 #3

对有工厂函数的服务，先 `export from` 再 `import` 同一符号。应统一为"先 import，再 export + 工厂函数"的两段式结构。

### P2-2. 代码组织无分组规律 [MEDIUM]

**来源**: 质量评审 #4 + 架构评审 A-7

服务排列无字母序、无业务域分组。建议按认证域 → 内容域 → 知识域 → 系统域分组。

### P2-3. skills-file.service.ts 内联实现违反分层约定 [MEDIUM]

**来源**: 架构评审 A-5

应将 `SkillsFileServiceImpl` 拆到 `impl/skills-file.service.impl.ts`。

### P2-4. knowledge.service.ts 承载 5 个独立接口 [MEDIUM]

**来源**: 架构评审 A-6

建议按领域拆分为 keyword、portrait、image、document、mined-keyword 五个独立服务文件。

### P2-5. 工厂函数零参数零验证，无安全增强能力 [MEDIUM]

**来源**: 安全评审 S-7

当前 4 个工厂函数等同于直接 `new`，建议添加安全增强参数（审计记录器、调用者身份）。

---

## 不采纳项

| 编号 | 来源 | 建议 | 不采纳原因 |
|------|------|------|-----------|
| S-4 | 安全评审 | 引入 tsyringe/inversify DI 容器 | 引入第三方 DI 框架超出 barrel 文件修复范围，且项目规模不足以 warrant DI 容器的复杂度 |
| 质量评审 #6 | 质量评审 | 添加 JSDoc 和文件头注释 | 工厂函数命名已自解释，barrel 文件是基础设施代码不需要 API 文档 |

---

## 修复路线图

### 阶段 1 — P0 修复（阻塞合并，必须完成）

```
1. 移除所有 XxxServiceImpl 导出（10 行）
2. 补全 4 个遗漏服务的接口 + 工厂函数导出
3. 为全部 14 个服务添加工厂函数
4. 迁移 9 个消费者到 barrel 工厂模式
5. SystemConfigService 添加 AuthContext 参数
```

### 阶段 2 — P1 修复（本迭代内）

```
1. Scheduler 迁移到 barrel 工厂
2. AuthContext 导出路径统一
3. 验证所有消费者通过 barrel 获取服务
```

### 阶段 3 — P2 改进（下一迭代）

```
1. 重构为三段式结构（imports / exports / factories）
2. 按业务域分组排序
3. skills-file.service.ts 实现拆分
4. 评估 knowledge.service.ts 拆分
```

---

## Committer 最终裁决

| 裁决 | 说明 |
|------|------|
| **REJECT** | 综合评分 2.9/10，3 项 CRITICAL 阻塞合并 |

### 裁决理由

1. **安全边界失效**: barrel 文件同时导出接口和实现类，使其作为安全策略执行点的能力为零。安全敏感服务（Auth、User、SystemConfig）的实现类可直接被实例化，无法在未来添加安全拦截。

2. **架构承诺未兑现**: 36% 的服务未被纳入 barrel，60% 的消费者绕过 barrel 直接访问内部路径。barrel 文件的存在没有产生实际架构价值，反而增加了混乱。

3. **质量问题系统性**: 不是孤立的代码缺陷，而是系统性的模式不一致——三种消费模式、四种导出风格、零工厂函数的服务占 71%。这表明该文件从未经过统一设计。

### 合并条件

完成阶段 1（P0）全部 5 项修复后可重新提交评审。预期修复后评分可达 7.0/10 APPROVE。

---

## 附录：完整服务导出审计

| 服务 | 接口 | 实现类 | barrel 导出接口 | barrel 导出实现 | 工厂函数 | Controller 消费方式 |
|------|------|--------|----------------|----------------|---------|-------------------|
| Auth | IAuthService | AuthServiceImpl | Yes | Yes | No | 直接 new |
| Company | ICompanyService | CompanyServiceImpl | Yes | Yes | No | 直接 new |
| Skills | ISkillsService | SkillsServiceImpl | Yes | Yes | No | 直接 new |
| User | IUserService | UserServiceImpl | Yes | Yes | Yes | 工厂函数 |
| LlmModel | ILlmModelService | LlmModelServiceImpl | Yes | Yes | Yes | 工厂函数 |
| SystemConfig | ISystemConfigService | SystemConfigServiceImpl | Yes | Yes | No | 直接 new |
| PublishingPlatform | IPublishingPlatformService | PublishingPlatformServiceImpl | Yes | Yes | No | 直接 new |
| Todo | ITodoService | TodoServiceImpl | Yes | Yes | No | 直接 new |
| Article | IArticleService | ArticleServiceImpl | Yes | Yes | Yes | 工厂函数 |
| Project | IProjectService | ProjectServiceImpl | Yes | Yes | Yes | 工厂函数 |
| Knowledge | 5 interfaces | 5 impls | **No** | **No** | **No** | 直接 new |
| KnowledgeBase | IKnowledgeBaseService | KnowledgeBaseServiceImpl | **No** | **No** | **No** | 直接 new |
| Llm | ILlmService | LlmServiceImpl | **No** | **No** | **No** | 直接 new |
| SkillsFile | ISkillsFileService | SkillsFileServiceImpl | **No** | **No** | **No** | 直接 new |
