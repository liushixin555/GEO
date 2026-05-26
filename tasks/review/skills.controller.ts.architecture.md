# skills.controller.ts 架构评审报告

## 评审范围
- `apis/controller/skills.controller.ts`
- `apis/service/impl/skills.service.impl.ts`
- `apis/service/impl/skills-file.service.impl.ts`
- `apis/entity/skills.entity.ts`
- `apis/utils/skill-md.util.ts`
- `apis/map/index.ts` (mapSkills)
- `apis/routes/skills.routes.ts`

## 综合评分：7.5/10

## 评审发现

### CRITICAL（已修复）

#### C1: delete 使用硬删除而非软删除
- **文件**: `skills.service.impl.ts:75-82`
- **问题**: Prisma schema 有 `deletedAt` 字段，但 service 使用 `prisma.skills.delete()` 硬删除
- **影响**: 数据不可恢复，且与 schema 设计意图不一致
- **修复**: 改为 `prisma.skills.update({ where: { id }, data: { deletedAt: new Date() } })`
- **同步修复**: list/getById/create/update 的 where 条件均增加 `deletedAt: null` 过滤
- **状态**: ✅ 已修复

#### C2: where 条件使用 `any` 类型
- **文件**: `skills.service.impl.ts:10`
- **问题**: `const where: any = {}` 绕过类型检查
- **修复**: 使用 `Prisma.SkillsWhereInput` 类型，同样 `Prisma.SkillsUpdateInput` 替代 update 中的 `any`
- **状态**: ✅ 已修复

### MAJOR（已修复）

#### M1: description 长度验证不一致
- **文件**: `skills-file.service.impl.ts:11` vs `skills.controller.ts:157` vs `prisma/schema.prisma:108`
- **问题**: 文件服务 `MAX_DESC_LENGTH=2000`，控制器 `500`，DB `VarChar(500)` — 三者不一致
- **修复**: 文件服务 `MAX_DESC_LENGTH` 改为 `500`，与 DB 和控制器对齐
- **状态**: ✅ 已修复

#### M2: mapSkills 参数使用 `any` 类型
- **文件**: `apis/map/index.ts:21`
- **问题**: `export function mapSkills(prismaSkills: any): Skills` 缺乏类型安全
- **修复**: 使用 `PrismaSkills & { creator?: { cnName?: string } | null }` 具体类型
- **状态**: ✅ 已修复

#### M3: update 时未校验名称唯一性
- **文件**: `skills.service.impl.ts:57-73`
- **问题**: 更新 name 字段时没有检查是否与其他记录冲突
- **修复**: 增加 `request.name !== existing.name` 时的重复名检查
- **状态**: ✅ 已修复

#### M4: parseSkillMd 使用普通 Error 而非 BusinessError
- **文件**: `apis/utils/skill-md.util.ts`
- **问题**: 抛出 `Error` 导致 controller 中被当成 500 错误处理，而非 400 业务错误
- **修复**: 改用 `BusinessError`，使错误正确返回 400 状态码
- **状态**: ✅ 已修复

#### M5: CreateSkillsRequest.created_by 类型过于宽松
- **文件**: `apis/entity/skills.entity.ts:16`
- **问题**: `created_by?: number | null` 允许 null，但 controller 始终传 number
- **修复**: 改为 `created_by?: number`，service 中统一用 `?? null` 处理
- **状态**: ✅ 已修复

### 已有优点（保留）

1. **文件服务抽取**: SkillsFileService 独立处理文件操作，职责清晰
2. **Zip Slip 防护**: extractSkillZip 中有完整的路径遍历校验
3. **Zip Bomb 防护**: 有 entry size 和 total extracted size 限制
4. **错误统一处理**: handleSkillError 统一处理各类型错误
5. **权限分层**: routes 层 roleMiddleware + controller 层作者/sysadmin 检查
6. **延迟初始化**: multer 实例懒加载
7. **事务回滚**: 创建失败时清理已解压目录

## 修改文件清单

| 文件 | 变更 |
|------|------|
| `apis/service/impl/skills.service.impl.ts` | 软删除+类型安全+唯一性检查 |
| `apis/controller/skills.controller.ts` | 注释修正+description验证优化 |
| `apis/entity/skills.entity.ts` | CreateSkillsRequest.created_by 类型收紧 |
| `apis/utils/skill-md.util.ts` | Error→BusinessError |
| `apis/service/impl/skills-file.service.impl.ts` | MAX_DESC_LENGTH 2000→500 |
| `apis/map/index.ts` | mapSkills 参数 any→具体类型 |
| `tests/apis/skills.entity.test.ts` | 新增 entity 接口测试 |
| `tests/apis/skill-md.util.test.ts` | 新增 SKILL.md 解析测试 |

## 测试结果

- 新增测试: 16个（entity 10 + util 6）
- 相关测试: 1302个全部通过
- map 测试: 215个全部通过（含 mapSkills）
