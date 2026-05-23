# TDD 执行报告 — skills.service.impl.ts

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/skills.service.impl.ts` |
| 接口定义 | `apis/service/skills.service.ts` |
| 测试文件 | `tests/apis/skills.service.test.ts` |
| 执行日期 | 2026-05-24 |
| 测试框架 | Jest + ts-jest |
| 测试数 | **84 个** |
| 结果 | **全部通过 (84/84)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 接口定义（ISkillsService）

```typescript
interface ISkillsService {
  list(page: number, pageSize: number, search?: string): Promise<{ list: Skills[]; total: number }>;
  getById(id: number): Promise<Skills>;
  create(request: CreateSkillsRequest): Promise<Skills>;
  update(id: number, request: UpdateSkillsRequest): Promise<Skills>;
  delete(id: number): Promise<void>;
}
```

## 测试用例明细

### list() — 19 个测试

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
| 15 | pageSize=1 时应只返回 1 条记录 | 最小分页 |
| 16 | page=0 时 skip 应为负数（-pageSize），由数据库处理 | 非常规分页 |
| 17 | search 包含特殊字符时应原样传递 | SQL注入防护验证 |
| 18 | 多条记录时 mapSkills 应逐条正确映射 | 批量映射 |
| 19 | search 为 "undefined" 字符串时应作为搜索词 | 字符串 "undefined" 边界 |

### getById() — 11 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回指定 ID 的技能 | 正常获取 |
| 2 | 技能不存在时应抛出错误 | 异常：不存在 |
| 3 | 应包含 creator 关联数据 | 关联数据 |
| 4 | mapSkills 应正确映射所有字段 | 全字段映射验证 |
| 5 | findFirst 抛出错误时应向上传播 | 错误传播 |
| 6 | ID 为 0 时应正常查询 | 零值 ID 边界 |
| 7 | ID 为负数时应正常查询（由数据库决定是否存在） | 负数 ID |
| 8 | createdBy=0 时 created_by 应为 0 | 零值创建人映射 |
| 9 | description 为 null 时映射结果应为 null | null 字段映射 |
| 10 | creator 存在但 cnName 为空字符串时 creator_name 应为空字符串 | 空字符串 falsy |
| 11 | creator 存在但 cnName 有值时 creator_name 应为该值 | 正常 creator 映射 |

### create() — 19 个测试

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
| 14 | name 包含 Unicode 字符时应正常创建 | Emoji/Unicode 支持 |
| 15 | description 包含多行文本时应正常传递 | 多行文本 |
| 16 | created_by=0 时不应包含在 data 中（0 是 falsy） | 零值边界 |
| 17 | 重名检查应精确匹配 name（区分大小写由数据库处理） | 重名检查验证 |
| 18 | name 为非常长的字符串时应正常传递 | 长字符串 |
| 19 | skill_dir 为空字符串时应正常传递 | 空路径 |

### update() — 18 个测试

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
| 14 | name 设为空字符串时应更新为空字符串 | 空字符串 vs undefined |
| 15 | description 设为空字符串时应更新为空字符串（非 null） | 空字符串 vs null 区分 |
| 16 | skill_dir 设为空字符串时应更新 skillDir | 空路径更新 |
| 17 | findFirst 查询抛出错误时应向上传播 | 错误传播 |
| 18 | ID 为负数时技能不存在应抛出错误 | 负数 ID |

### delete() — 8 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应成功软删除技能（设置 deletedAt） | 软删除验证 |
| 2 | 技能不存在时应抛出错误 | 不存在异常 |
| 3 | 查找时应检查 deletedAt 为 null | 防止重复删除 |
| 4 | 已软删除的技能再次删除应抛出错误 | 重复删除保护 |
| 5 | 删除后返回值应为 void（undefined） | 返回值验证 |
| 6 | 软删除操作抛出错误时应向上传播 | 错误传播 |
| 7 | findFirst 抛出错误时应向上传播 | 错误传播 |
| 8 | 软删除应设置 deletedAt 为 Date 实例 | Date 类型验证 |

### mapSkills 映射完整性 — 2 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | createdBy 为 undefined 时 created_by 应为 null（?? 运算符） | ?? 运算符边界 |
| 2 | 所有字段为默认值时应正确映射 | 全默认值映射 |

### 接口一致性 — 6 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | SkillsServiceImpl 应实现 ISkillsService 的所有方法 | 接口完整性 |
| 2 | list 方法签名应接受 (page, pageSize, search?) | 参数数量 |
| 3 | getById 方法签名应接受 (id) | 参数数量 |
| 4 | create 方法签名应接受 (request) | 参数数量 |
| 5 | update 方法签名应接受 (id, request) | 参数数量 |
| 6 | delete 方法签名应接受 (id) | 参数数量 |

## 测试覆盖维度分析

| 维度 | 覆盖情况 | 测试数 |
|------|---------|--------|
| 正常流程（Happy Path） | 所有 CRUD 操作 | 12 |
| 错误传播 | 每个方法每个 Prisma 操作 | 11 |
| 分页计算 | skip/take 公式验证 | 3 |
| 搜索过滤 | 有/无/空/特殊字符搜索 | 5 |
| 字段映射 | camelCase ↔ snake_case | 8 |
| 空值/null 处理 | null/undefined/空字符串 | 10 |
| 软删除保护 | deletedAt 过滤和重复删除 | 4 |
| 重名校验 | 同名创建拦截 | 2 |
| 部分更新 | 只传部分字段 | 5 |
| 关联查询 | creator include | 4 |
| 边界值 | 0、负数、特殊字符、长字符串 | 12 |
| 接口一致性 | 方法签名验证 | 6 |
| 数据类型 | Date、string、number、null | 2 |

## 关键测试策略

1. **Mock 模式**: 使用 `jest.mock` 模拟 `getPrisma()`，返回 mock 的 PrismaClient
2. **Helper 函数**: `makePrismaSkill()` 和 `makeMappedSkill()` 构建标准测试数据
3. **分支覆盖**: 针对 `if (search)`、`if (existing)`、`if (!item)`、`if (request.name !== undefined)` 等所有分支均编写测试
4. **字段映射**: 验证 Prisma camelCase → entity snake_case 的映射（skillDir → skill_dir, createdBy → created_by）
5. **边界值**: 空字符串 search、null created_by、空 update 请求、0/负数 ID、Unicode 字符等
6. **错误传播**: 每个方法每个 Prisma 操作均测试异常传播行为

## 更新历史

### 2026-05-24 补全（51 → 84）

新增 33 个测试用例：

| 分类 | 新增测试 | 说明 |
|------|---------|------|
| list 边界 | pageSize=1、page=0、特殊字符搜索、多条映射、"undefined" 搜索词 | 5 |
| getById 边界 | ID=0、ID=-1、createdBy=0、description=null、cnName=''、cnName 有值 | 6 |
| create 边界 | Unicode name、多行 description、created_by=0、重名精确匹配、长 name、空 skill_dir | 6 |
| update 边界 | name=''、description='' vs null、skill_dir=''、findFirst 抛错、负数 ID | 5 |
| delete 边界 | findFirst 抛错、deletedAt 为 Date 实例、ID=0 | 3 |
| mapSkills 映射 | createdBy=undefined、全默认值映射 | 2 |
| 接口一致性 | 5 个方法签名 + 接口完整性 | 6 |
