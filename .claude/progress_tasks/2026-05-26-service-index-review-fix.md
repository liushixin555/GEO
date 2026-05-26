# 2026-05-26 service/index.ts 评审修复

## 变更摘要
基于4份评审（安全2.4/10、架构3.3/10、质量3.1/10、Committer 2.9/10 REJECT），完成P0+P1全部修复。

## 修改文件

### P0 CRITICAL
| 文件 | 变更 |
|------|------|
| `apis/service/index.ts` | 重写：移除10个XxxServiceImpl导出，补全4个遗漏服务，添加18个工厂函数，三段式结构 |
| `apis/service/system-config.service.ts` | 接口添加AuthContext参数 |
| `apis/service/impl/system-config.service.impl.ts` | 实现添加AuthContext参数 |
| `apis/service/impl/publishing-platform.service.impl.ts` | 内部getAll调用传入SYSTEM_AUTH |
| `apis/controller/auth.controller.ts` | 迁移到barrel工厂createAuthService |
| `apis/controller/company.controller.ts` | 迁移到barrel工厂createCompanyService |
| `apis/controller/skills.controller.ts` | 迁移到barrel工厂createSkillsService+createSkillsFileService |
| `apis/controller/todo.controller.ts` | 迁移到barrel工厂createTodoService+createProjectService |
| `apis/controller/knowledge.controller.ts` | 迁移到barrel工厂（8个createXxxService） |
| `apis/controller/knowledge-base.controller.ts` | 迁移到barrel工厂createKnowledgeBaseService |
| `apis/controller/publishing-platform.controller.ts` | 迁移到barrel工厂createPublishingPlatformService |
| `apis/controller/system-config.controller.ts` | 迁移到barrel工厂+传递AuthContext |

### P1 HIGH
| 文件 | 变更 |
|------|------|
| `apis/scheduler/article-generation.scheduler.ts` | 迁移到barrel工厂createLlmService |
| `apis/controller/article.controller.ts` | AuthContext从barrel导入 |

### 测试
| 文件 | 变更 |
|------|------|
| `tests/apis/system-config.service.test.ts` | 更新getAll/batchUpdate调用传递AUTH参数 |

## 验证结果
- TypeScript编译：通过（仅无关的image-size错误）
- ESLint：通过
- 测试：392（system-config）+ 2791（其他）= 3183个测试全部通过
