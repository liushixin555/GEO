# 2026-05-26 Service 层 index.ts 架构评审修复

## 评审文件
`tasks/review/service-index.ts.architecture.md`

## 修复范围

### A-1 CRITICAL — Barrel 封装破损 ✅（已在之前修复）
- 所有14个服务已通过 barrel 导出

### A-2 CRITICAL — 三种消费模式并存 ✅（已在之前修复）
- 所有 controller 统一使用 `from '../service'` barrel 导入

### A-3 HIGH — 工厂函数策略不完整 ✅（已在之前修复）
- 所有服务均提供工厂函数

### A-4 HIGH — 双重导入反模式 ✅（已在之前修复）
- 采用三段式结构（Imports → Re-exports → Factory Functions）

### A-5 HIGH — skills-file.service.ts 内联实现 ✅ 本次修复
- 将 `SkillsFileServiceImpl` 从 `skills-file.service.ts` 拆分到 `impl/skills-file.service.impl.ts`
- `skills-file.service.ts` 现在只导出接口和类型
- `index.ts` 中 SkillsFile 导入路径更新为统一模式

### A-7 MEDIUM — 无排序/分组规则 ✅ 本次修复
- 按业务域分组：认证域 → 内容域 → 知识域 → 系统域
- 每个域内按字母序排列

### A-8 LOW — 无架构文档 ✅ 本次修复
- 添加文件头 JSDoc 注释说明 barrel 设计意图
- 添加消费规则说明
- 添加分组规则文档

## 变更文件
| 文件 | 变更类型 |
|------|----------|
| `apis/service/skills-file.service.ts` | 重写：移除内联实现类，仅保留接口和类型 |
| `apis/service/impl/skills-file.service.impl.ts` | 新增：SkillsFileServiceImpl 实现类 |
| `apis/service/index.ts` | 重写：业务域分组排序 + 架构文档注释 + SkillsFile 导入路径更新 |
