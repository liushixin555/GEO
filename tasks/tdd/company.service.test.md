# company.service.test.ts - TDD 执行报告

## 测试文件
`tests/apis/company.service.test.ts`

## 被测文件
`apis/service/impl/company.service.impl.ts`

## 测试结果
- **测试数量**: 44 个测试
- **通过率**: 100% (44/44)
- **执行时间**: ~4.8s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

## 测试用例清单

### list() - 5 个测试
1. ✅ 应返回按 id 升序排列的所有公司
2. ✅ 无公司时返回空数组
3. ✅ 应返回单个公司
4. ✅ 应正确映射所有公司字段
5. ✅ 应返回大量公司并正确映射

### getById() - 8 个测试
1. ✅ 应返回包含运营者和查看者的公司详情
2. ✅ 公司不存在时应抛出错误
3. ✅ 应返回仅有运营者（无查看者）的详情
4. ✅ 应返回仅有查看者（无运营者）的详情
5. ✅ 应返回无用户的详情
6. ✅ 应返回完整的 CompanyDetail 结构（含所有字段）
7. ✅ 应处理 address 为 null 的公司
8. ✅ 验证 findUnique 使用正确的 where 条件

### create() - 8 个测试
1. ✅ 应创建公司并关联运营者和查看者
2. ✅ 应创建无 viewer_ids 的公司
3. ✅ 应创建带空 viewer_ids 数组的公司
4. ✅ 未提供地址时 address 应为 null
5. ✅ 应将每个查看者关联到新公司
6. ✅ 应处理 viewer_ids 为 undefined 的情况
7. ✅ 应传播事务错误
8. ✅ 应正确处理单个 operator

### update() - 9 个测试
1. ✅ 应更新公司信息并重新关联用户
2. ✅ 更新前应解除之前的 admin 和 view 用户关联
3. ✅ 应更新无 viewer_ids 的公司
4. ✅ 应更新带空 viewer_ids 数组的公司
5. ✅ 应以正确数据调用 company.update（包含 null address）
6. ✅ 应将每个查看者关联到更新的公司
7. ✅ 应处理 viewer_ids 为 undefined 的情况
8. ✅ 应传播事务错误
9. ✅ 应处理大量 operators 和 viewers

### toggleStatus() - 7 个测试
1. ✅ 应启用公司（设置 status 为 true）
2. ✅ 应禁用公司（设置 status 为 false）
3. ✅ 公司不存在时应抛出错误
4. ✅ 切换后应返回映射后的公司对象
5. ✅ 应以正确的 where 条件调用 findUnique
6. ✅ 应处理切换为相同状态
7. ✅ 应处理 prisma update 错误

### Edge cases - 6 个测试
1. ✅ create: 验证 operator 关联使用正确的 companyId
2. ✅ create: 空 operator_ids 且无 viewer_ids 时不调用 user.update
3. ✅ create: 提供 address 时应保留原值
4. ✅ update: 验证 operator/viewer 关联使用正确的 companyId
5. ✅ update: 提供 address 时应保留原值
6. ✅ getById: 验证 findUnique 使用正确的 where 条件

### 额外健壮性 - 2 个测试
1. ✅ list: 每次 list 调用仅调用一次 getPrisma
2. ✅ getById: 每次 getById 调用仅调用一次 getPrisma

## 关键覆盖分支
- `create`: `if (request.viewer_ids?.length)` → true/false/undefined 均覆盖
- `update`: `if (request.viewer_ids?.length)` → true/false/undefined 均覆盖
- `getById`: `if (!company)` → true/false 均覆盖
- `toggleStatus`: `if (!existing)` → true/false 均覆盖

## 测试策略
- 使用 `jest.mock` 模拟 `getPrisma` 返回值
- 每个测试通过构造 mock prisma 对象隔离数据库依赖
- 使用 `$transaction` mock 的 `mockImplementation` 模式直接执行回调函数
- 测试覆盖了正常路径、异常路径、边界条件和错误传播

## 执行时间
2026-05-24
