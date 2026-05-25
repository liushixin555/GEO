# apis/service/index.ts — 软件质量评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 完整性 | 3.0/10 | CRITICAL |
| 一致性 | 3.5/10 | HIGH |
| 结构性 | 4.0/10 | MEDIUM |
| 可维护性 | 4.0/10 | MEDIUM |
| 文档性 | 1.0/10 | LOW |
| **综合** | **3.1/10** | **CRITICAL** |

---

## 1. CRITICAL — 遗漏 4 个服务的导出

index.ts 作为 service 层的 barrel 文件，遗漏了 4 个已存在的服务模块，外部消费者必须直接引用内部路径，破坏了封装性。

| 遗漏服务 | 接口 | 实现 | 附加类型 |
|----------|------|------|----------|
| `llm.service.ts` | `ILlmService` | `LlmServiceImpl` | `ArticleGenerationParams` |
| `knowledge-base.service.ts` | `IKnowledgeBaseService` | `KnowledgeBaseServiceImpl` | — |
| `knowledge.service.ts` | `IKeywordService`, `IPortraitService`, `IImageService`, `IDocumentService`, `IMinedKeywordService` | 对应 5 个 `XxxServiceImpl` | — |
| `skills-file.service.ts` | `ISkillsFileService` | `SkillsFileServiceImpl`（内联） | `SkillZipResult` |

**影响**：controller 层或 route 层引用这些服务时被迫写 `../service/llm.service` 等深层路径；新增消费者不知道该从 barrel 还是直接引用，引入不一致的导入风格。

---

## 2. HIGH — 工厂函数模式不一致

10 个已导出的服务中，仅 4 个提供了 `createXxxService()` 工厂函数：

| 有工厂函数 | 无工厂函数 |
|-----------|-----------|
| `createUserService` | `IAuthService` / `AuthServiceImpl` |
| `createLlmModelService` | `ICompanyService` / `CompanyServiceImpl` |
| `createArticleService` | `ISkillsService` / `SkillsServiceImpl` |
| `createProjectService` | `ISystemConfigService` / `SystemConfigServiceImpl` |
| | `IPublishingPlatformService` / `PublishingPlatformServiceImpl` |
| | `ITodoService` / `TodoServiceImpl` |

**问题**：不一致意味着消费者不清楚应该使用 `new XxxServiceImpl()` 还是 `createXxxService()`，无法形成统一的依赖注入心智模型。

---

## 3. HIGH — 冗余 import 语句

文件先通过 `export { ... } from '...'` 重导出符号，再通过 `import { ... } from '...'` 导入同一符号用于工厂函数。例如：

```typescript
// 第 7-8 行：重导出
export { IUserService, UserListOptions } from './user.service';
export { UserServiceImpl } from './impl/user.service.impl';

// 第 10-11 行：再次导入同一符号
import { IUserService } from './user.service';
import { UserServiceImpl } from './impl/user.service.impl';
```

`export ... from` 不会将符号引入当前模块作用域，因此 `import` 是必要的——但这种"先 export 再 import"的写法容易误判为冗余。应统一改为"先 import，再 export + 工厂函数"的清晰两段式结构。

---

## 4. MEDIUM — 代码组织缺乏分组规律

当前文件的排列没有遵循可辨识的分组规则：

```
行 1-8:   auth, company, skills, user 的 export
行 10-15: user 的 import + 工厂函数
行 16-17: llm-model 的 export
行 19-24: llm-model 的 import + 工厂函数
行 25-34: system-config, publishing-platform, todo, article, project 的 export（连续 5 个）
行 36-47: article + project 的 import + 工厂函数
```

问题：
- 有的服务 export 和 factory 紧邻（user、llm-model），有的相隔 10+ 行（article、project）
- 无注释分隔区域
- 无字母序或领域序排列

---

## 5. MEDIUM — 排序无规则

10 个已导出服务的排列顺序：`auth → company → skills → user → llm-model → system-config → publishing-platform → todo → article → project`

既非字母序，也非按业务域分组（如：认证域 auth/user、业务域 company/article/project、系统域 system-config/llm-model）。

---

## 6. LOW — 零文档

- 无文件头注释说明 barrel 文件的用途
- 无分区注释（如 `// === Auth Services ===`）
- 无 JSDoc 说明工厂函数的设计意图

---

## 修复建议

### 建议 A：统一两段式结构（推荐）

```typescript
// === Imports ===
import { IAuthService } from './auth.service';
import { AuthServiceImpl } from './impl/auth.service.impl';
// ... 所有 import

// === Re-exports ===
export { IAuthService, AuthServiceImpl } from './auth.service';
// ... 所有 export

// === Factory Functions ===
export function createAuthService(): IAuthService {
  return new AuthServiceImpl();
}
// ... 所有工厂函数
```

优点：import / export / factory 三区清晰，无冗余，易于审查。
适用场景：所有服务均需要工厂函数。

### 建议 B：纯 barrel 导出（如果工厂函数非必需）

```typescript
// Auth
export { IAuthService } from './auth.service';
export { AuthServiceImpl } from './impl/auth.service.impl';

// Company
export { ICompanyService } from './company.service';
export { CompanyServiceImpl } from './impl/company.service.impl';

// ... 按字母序排列所有服务（含遗漏的 4 个）
```

优点：最简结构，无工厂函数歧义。
适用场景：DI 容器或 controller 自行实例化。

### 通用修复项

1. **补充遗漏的 4 个服务导出**
2. **统一排序规则**（推荐字母序）
3. **决定工厂函数策略**：要么全部添加，要么全部移除
4. **添加分区分隔注释**

---

## 评审结论

| 级别 | 数量 | 项目 |
|------|------|------|
| CRITICAL | 1 | 遗漏 4 个服务导出 |
| HIGH | 2 | 工厂函数不一致、冗余 import 模式 |
| MEDIUM | 2 | 代码组织混乱、排序无规则 |
| LOW | 1 | 零文档 |
| **总计** | **6** | |

**结论：CONDITIONAL APPROVE** — barrel 文件功能上可工作，但遗漏了 36%（4/14）的服务导出，且模式不一致会增加后续维护成本。建议优先修复 CRITICAL 项（补充遗漏导出），再统一工厂函数策略。
