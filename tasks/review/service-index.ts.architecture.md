# apis/service/index.ts — 软件架构评审

**评审角色**: 软件架构专家
**评审日期**: 2026-05-26
**文件**: `apis/service/index.ts`（48 行）
**范围**: Service 层 barrel 文件的架构职责、消费者耦合、模式一致性

---

## 综合评分

| 维度 | 评分 | 等级 |
|------|------|------|
| 封装性（Barrel 完整度） | 2.5/10 | CRITICAL |
| 抽象一致性（消费模式） | 3.0/10 | CRITICAL |
| 依赖倒置（DI 策略） | 3.5/10 | HIGH |
| 内聚性（代码组织） | 3.5/10 | HIGH |
| 可演化性（扩展能力） | 4.0/10 | MEDIUM |
| **综合** | **3.3/10** | **CRITICAL** |

---

## A-1. CRITICAL — Barrel 封装破损：36% 服务未导出，消费者被迫穿透内部路径

index.ts 作为 Service 层唯一的公共入口（barrel），遗漏了 4 个已存在的服务模块（共 14 个），导致 36% 的服务未被封装。

**遗漏的服务：**

| 服务 | 接口数 | 实现类 |
|------|--------|--------|
| `knowledge.service.ts` | 5（IKeywordService, IPortraitService, IImageService, IDocumentService, IMinedKeywordService） | 5 个 XxxServiceImpl |
| `knowledge-base.service.ts` | 1（IKnowledgeBaseService） | KnowledgeBaseServiceImpl |
| `llm.service.ts` | 1（ILlmService） | LlmServiceImpl |
| `skills-file.service.ts` | 1（ISkillsFileService） | SkillsFileServiceImpl（内联） |

**实际影响**（从 controller 导入语句验证）：

```
knowledge.controller.ts:
  import { KeywordServiceImpl, ... } from '../service/impl/knowledge.service.impl';   ← 穿透
  import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl'; ← 穿透
  import { LlmServiceImpl } from '../service/impl/llm.service.impl';                   ← 穿透

knowledge-base.controller.ts:
  import { KnowledgeBaseServiceImpl } from '../service/impl/knowledge-base.service.impl'; ← 穿透

skills.controller.ts:
  import { SkillsFileServiceImpl } from '../service/skills-file.service';                  ← 穿透
```

**架构后果**：
- barrel 的封装承诺被打破——消费者无法仅通过 `../service` 获取所有服务
- 新开发者无法判断"应该从 barrel 还是直接引用"，导致混乱的导入风格
- 重构内部目录结构时，穿透引用成为隐藏耦合点，极易遗漏

---

## A-2. CRITICAL — 三种消费模式并存，抽象层形同虚设

对 12 个 controller 的导入方式审计，发现 3 种截然不同的服务获取模式：

**模式 A — 工厂函数 via barrel（4 个 controller）：**
```typescript
// article.controller.ts
import { createArticleService, IArticleService } from '../service';
const articleService: IArticleService = createArticleService();
```

**模式 B — 直接 new 实现，完全绕过 barrel（6 个 controller）：**
```typescript
// auth.controller.ts
import { AuthServiceImpl } from '../service/impl/auth.service.impl';
const authService: IAuthService = new AuthServiceImpl();
```

**模式 C — 接口从 barrel，实现从 impl（混合穿透）（2 个 controller）：**
```typescript
// todo.controller.ts
import { ITodoService } from '../service/todo.service';       // 接口路径
import { TodoServiceImpl } from '../service/impl/todo.service.impl'; // 实现路径
```

**问题本质**：barrel 文件提供了工厂函数和重导出两种抽象机制，但 controller 层没有任何强制约束要求使用统一入口。结果是抽象层的存在只覆盖了 42%（5/12）的消费者，其余 58% 直接穿透到内部路径。

**架构风险**：
- 将实现类路径硬编码到 controller 中，违反依赖倒置原则（DIP）
- 替换实现（如 mock 测试、更换 ORM）需要修改每个 controller 的导入路径
- 无法在 barrel 层统一添加横切关注点（日志、事务、缓存装饰器）

---

## A-3. HIGH — 工厂函数策略不完整，破坏依赖倒置意图

10 个已导出服务中，仅 4 个提供工厂函数：

| 有工厂函数 | 无工厂函数 |
|-----------|-----------|
| `createUserService` | AuthService |
| `createLlmModelService` | CompanyService |
| `createArticleService` | SkillsService |
| `createProjectService` | SystemConfigService |
| | PublishingPlatformService |
| | TodoService |

工厂函数的核心价值是将消费者与具体实现类解耦。部分服务有、部分没有，意味着：
- 有工厂函数的服务消费者可以仅依赖接口（DIP）
- 没有工厂函数的服务消费者被迫 `import { XxxServiceImpl }` 然后手动 `new`
- 两套心智模型增加了团队认知负担

---

## A-4. HIGH — 双重导入反模式：同一符号 import + export from

当前文件对有工厂函数的服务采用"先 export from，再 import"的模式：

```typescript
// 第 7-8 行：export-from（不引入作用域）
export { IUserService, UserListOptions } from './user.service';
export { UserServiceImpl } from './impl/user.service.impl';

// 第 10-11 行：再次导入同一符号（供工厂函数使用）
import { IUserService } from './user.service';
import { UserServiceImpl } from './impl/user.service.impl';
```

这导致：
- 每个有工厂函数的服务，其接口和实现类被解析了两次
- 模块图中出现冗余依赖边
- 代码审查时容易误判为"冗余 import 可以删除"

---

## A-5. HIGH — skills-file.service.ts 内联实现，违反分层约定

项目中所有服务遵循 `interface → impl/` 分层约定，唯独 `skills-file.service.ts` 将实现类 `SkillsFileServiceImpl` 内联在接口文件中：

```
skills.service.ts          → impl/skills.service.impl.ts     ✓ 分层
knowledge-base.service.ts  → impl/knowledge-base.service.impl.ts ✓ 分层
skills-file.service.ts     → （SkillsFileServiceImpl 内联） ✗ 违反分层
```

这不仅破坏了目录约定的一致性，还使得 barrel 文件无法按统一模式导出（其他服务是 `from './xxx.service'` + `from './impl/xxx.service.impl'` 两行，skills-file 只需一行但模式不同）。

---

## A-6. MEDIUM — knowledge.service.ts 承载 5 个独立接口，职责边界模糊

```
knowledge.service.ts → IKeywordService, IPortraitService, IImageService, IDocumentService, IMinedKeywordService
```

单个文件承载 5 个独立的 Service 接口和对应的 5 个实现类。从单一职责原则看：
- 这 5 个接口分别处理关键词、人像、图片、文档、挖掘关键词，领域边界不同
- 文件行数和复杂度远超其他服务接口文件
- barrel 导出时需要一次性导出 10 个符号（5 接口 + 5 实现），增加维护成本

建议按领域拆分为 `keyword.service.ts`、`portrait.service.ts` 等。

---

## A-7. MEDIUM — 无排序规则，无分组策略

10 个已导出服务的排列：`auth → company → skills → user → llm-model → system-config → publishing-platform → todo → article → project`

- 非字母序
- 非业务域分组（如：认证域、业务域、系统域）
- 非添加时间序（user 和 auth 是最早的功能但排在中间）

新增服务时没有明确的插入位置规则，文件将随着增长越来越混乱。

---

## A-8. LOW — 无架构文档

- 无文件头注释说明 barrel 的设计意图（是 DI 容器入口？纯重导出？）
- 无 JSDoc 说明工厂函数的设计决策
- 无注释解释为何部分服务无工厂函数

---

## 架构改进路线图

### 阶段 1：修复 CRITICAL（立即）

**1a. 补全遗漏导出 + 统一工厂函数**

将所有 14 个服务纳入 barrel，统一提供工厂函数：

```typescript
// === Auth ===
import { IAuthService } from './auth.service';
import { AuthServiceImpl } from './impl/auth.service.impl';

export type { IAuthService };
export { AuthServiceImpl };
export function createAuthService(): IAuthService { return new AuthServiceImpl(); }

// === Knowledge Base ===
import { IKnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseServiceImpl } from './impl/knowledge-base.service.impl';

export type { IKnowledgeBaseService };
export { KnowledgeBaseServiceImpl };
export function createKnowledgeBaseService(): IKnowledgeBaseService { return new KnowledgeBaseServiceImpl(); }

// ... 所有 14 个服务同理
```

**1b. 逐步迁移 controller 到统一消费模式**

```typescript
// 目标：所有 controller 通过 barrel + 工厂函数消费
import { createAuthService, IAuthService } from '../service';
const authService: IAuthService = createAuthService();
```

### 阶段 2：修复 HIGH（短期）

**2a. 重构文件内部结构为三段式**

```
// Section 1: Imports
// Section 2: Re-exports
// Section 3: Factory Functions
```

**2b. 将 skills-file.service.ts 的实现拆到 impl/**

### 阶段 3：改进 MEDIUM（中期）

**3a.** 按业务域分组排序：认证域 → 内容域 → 知识域 → 系统域
**3b.** 评估 knowledge.service.ts 是否需要按接口拆分

---

## 评审总结

| 级别 | 数量 | 编号 | 项目 |
|------|------|------|------|
| CRITICAL | 2 | A-1 | Barrel 封装破损（36% 服务未导出） |
| | | A-2 | 三种消费模式并存，抽象层失效 |
| HIGH | 3 | A-3 | 工厂函数策略不完整 |
| | | A-4 | 双重导入反模式 |
| | | A-5 | skills-file 内联实现违反分层约定 |
| MEDIUM | 2 | A-6 | knowledge.service.ts 职责边界模糊 |
| | | A-7 | 无排序/分组规则 |
| LOW | 1 | A-8 | 无架构文档 |
| **总计** | **8** | | |

**结论：REJECT** — 作为 Service 层的架构入口文件，index.ts 未能履行其核心职责（封装 + 统一访问入口）。58% 的消费者绕过 barrel 直接引用内部路径，36% 的服务完全未被纳入。这不是代码质量问题，而是架构设计缺陷——barrel 文件的存在本身没有被强制执行，形同虚设。

**修复优先级**：A-1（补全导出）→ A-2（统一消费模式）→ A-3（补全工厂函数）→ A-4/A-5（清理反模式）
