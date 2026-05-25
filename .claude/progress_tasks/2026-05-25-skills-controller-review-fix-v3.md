# skills.controller.ts 多轮评审修复（v3）

**日期**: 2026-05-25
**文件**: `apis/controller/skills.controller.ts` + `apis/service/skills-file.service.ts`
**评审来源**: 质量/架构/安全/Committer 四份评审报告

## 修复清单

### skills.controller.ts (188→188 行，功能增强)

| # | 来源 | 问题 | 修复 |
|---|------|------|------|
| 1 | 架构 MINOR-1 | parseInt 缺少 radix，与 getSkills 不一致 | 补全 radix 10 参数 |
| 2 | 质量 M-1 + 安全 M-1 | updateSkills 缺少字段类型/长度校验 | 添加 typeof + trim + 长度限制（name≤200, desc≤2000） |
| 3 | 质量 M-2 | 关键操作缺少结构化日志 | 引入 logger，create/update/delete 成功后记录 skill.created/updated/deleted |
| 4 | 架构 OBS-2 | uploadSkillMiddleware 未区分 MulterError | 区分 LIMIT_FILE_SIZE/LIMIT_UNEXPECTED_FILE 返回友好中文提示 |
| 5 | 架构 MINOR-3 | req.user 检查冗余但保留防御性编程 | 添加注释说明 Defensive: authMiddleware guarantees |

### skills-file.service.ts (新增 2 项防护)

| # | 来源 | 问题 | 修复 |
|---|------|------|------|
| 6 | 安全 M-3 | removeSkillDir 符号链接 TOCTOU | 添加 fs.lstatSync + isSymbolicLink 检查 |
| 7 | 架构 MINOR-2 | extractSkillZip 部分提取残留 | 解压循环包裹 try-catch，失败时 rmSync 清理 skillDir |

## 验证

- TypeScript 编译：通过
- ESLint：通过
- 测试：4 套件 491 用例全通过
