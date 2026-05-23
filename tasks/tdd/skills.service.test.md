# TDD 执行报告 — skills.service.impl.ts

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/skills.service.impl.ts` |
| 测试文件 | `tests/apis/skills.service.test.ts` |
| 执行日期 | 2026-05-24 |
| 测试框架 | Jest + ts-jest |
| 测试数 | 51 个 |
| 结果 | **全部通过 (51/51)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 测试用例明细

### list() — 14 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回分页列表和总数 | 验证基本分页返回结构 |
| 2 | 应正确计算分页偏移量 skip = (page - 1) * pageSize | 验证 page=3, pageSize=20 时 skip=40 |
| 3 | 第一页 page=1 时 skip 应为 0 | 边界值验证 |
| 4 | 有 search 参数时应按 name 过滤（insensitive） | 验证搜索条件传递 |
| 5 | 无 search 参数时 where 应为空对象 | 无搜索条件 |
| 6 | search 为空字符串时 where 应为空对象 | 空字符串 falsy |
| 7 | 应按 id 降序排列 | 排序验证 |
| 8 | 应包含 creator 关联数据 | include 验证 |
| 9 | 返回空列表时应正确映射 | 空结果边界 |
| 10 | Promise.all 应并行执行 findMany 和 count | 并行执行验证 |
| 11 | mapSkills 应正确映射 skillDir → skill_dir | 字段映射 |
| 12 | creator 为 null 时 creator_name 应为 null | null 关联处理 |
| 13 | findMany 抛出错误时应向上传播 | 错误传播 |
| 14 | count 抛出错误时应向上传播 | 错误传播 |

### getById() — 5 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回指定 ID 的技能 | 正常获取 |
| 2 | 技能不存在时应抛出错误 | 异常：不存在 |
| 3 | 应包含 creator 关联数据 | 关联数据 |
| 4 | mapSkills 应正确映射所有字段 | 全字段映射验证 |
| 5 | findFirst 抛出错误时应向上传播 | 错误传播 |

### create() — 13 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应成功创建技能并返回映射结果 | 正常创建 |
| 2 | 同名技能已存在时应抛出错误 | 重名校验 |
| 3 | 应先检查重名再创建 | 执行顺序 |
| 4 | description 为 undefined 时应传 null | 可选字段默认值 |
| 5 | description 有值时应正常传递 | 可选字段有值 |
| 6 | created_by 有值时应包含在 data 中 | 创建人传递 |
| 7 | created_by 为 null 时不应包含在 data 中 | null 创建人 |
| 8 | created_by 为 undefined 时不应包含在 data 中 | 未传创建人 |
| 9 | 创建时应包含 creator 关联查询 | include 验证 |
| 10 | skillDir 应正确映射为 skill_dir | 字段映射 |
| 11 | description 为空字符串时应转为 null（falsy 值） | 空字符串边缘场景 |
| 12 | findFirst 检查重名抛出错误时应向上传播 | 错误传播 |
| 13 | create 操作抛出错误时应向上传播 | 错误传播 |

### update() — 13 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应成功更新技能并返回映射结果 | 正常更新 |
| 2 | 技能不存在（含已软删除）时应抛出错误 | 不存在异常 |
| 3 | 查找现有记录时应检查 deletedAt 为 null | 软删除过滤 |
| 4 | 只更新 name 时 data 应只包含 name | 单字段更新 |
| 5 | 只更新 description 时 data 应只包含 description | 单字段更新 |
| 6 | 只更新 skill_dir 时 data 应只包含 skillDir | 单字段更新+映射 |
| 7 | 同时更新多个字段时 data 应包含所有字段 | 多字段更新 |
| 8 | 空请求对象时 data 应为空对象 | 空更新 |
| 9 | 字段值为 undefined 时不应包含在 data 中 | undefined 过滤 |
| 10 | 更新时应包含 creator 关联查询 | include 验证 |
| 11 | update 应使用 where: { id } 定位记录 | where 条件 |
| 12 | description 设为 null 时应更新 description 为 null | null 值更新 |
| 13 | update 操作抛出错误时应向上传播 | 错误传播 |

### delete() — 6 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应成功软删除技能（设置 deletedAt） | 软删除验证 |
| 2 | 技能不存在时应抛出错误 | 不存在异常 |
| 3 | 查找时应检查 deletedAt 为 null | 防止重复删除 |
| 4 | 已软删除的技能再次删除应抛出错误 | 重复删除保护 |
| 5 | 删除后返回值应为 void（undefined） | 返回值验证 |
| 6 | 软删除操作抛出错误时应向上传播 | 错误传播 |

## 关键测试策略

1. **Mock 模式**: 使用 `jest.mock` 模拟 `getPrisma()`，返回 mock 的 PrismaClient
2. **Helper 函数**: `makePrismaSkill()` 和 `makeMappedSkill()` 构建标准测试数据
3. **分支覆盖**: 针对 if (search)、if (existing)、if (!item)、if (request.name !== undefined) 等所有分支均编写测试
4. **字段映射**: 验证 Prisma camelCase → entity snake_case 的映射（skillDir → skill_dir, createdBy → created_by）
5. **边界值**: 空字符串 search、null created_by、空 update 请求等
6. **错误传播**: 每个方法均测试 Prisma 操作抛出异常时的错误传播行为

## 本次补全内容（42 → 51）

新增 9 个测试用例：

| 方法 | 新增测试 | 说明 |
|------|---------|------|
| list | findMany 抛出错误时应向上传播 | 错误传播 |
| list | count 抛出错误时应向上传播 | 错误传播 |
| getById | findFirst 抛出错误时应向上传播 | 错误传播 |
| create | description 为空字符串时应转为 null | 空字符串 falsy 行为 |
| create | findFirst 检查重名抛出错误时应向上传播 | 错误传播 |
| create | create 操作抛出错误时应向上传播 | 错误传播 |
| update | description 设为 null 时应更新 description 为 null | null 值显式更新 |
| update | update 操作抛出错误时应向上传播 | 错误传播 |
| delete | 软删除操作抛出错误时应向上传播 | 错误传播 |
