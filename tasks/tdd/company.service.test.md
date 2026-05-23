# company.service.test.ts - TDD 执行报告

## 测试文件
`tests/apis/company.service.test.ts`

## 被测文件
`apis/service/impl/company.service.impl.ts`

## 测试结果
- **测试数量**: 31 个测试
- **通过率**: 100% (31/31)
- **执行时间**: ~4.7s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

## 测试用例清单

### list() - 4 个测试
1. ✅ 应返回按 id 升序排列的所有公司
2. ✅ 无公司时返回空数组
3. ✅ 应返回单个公司
4. ✅ 应正确映射所有公司字段

### getById() - 5 个测试
1. ✅ 应返回包含运营者和查看者的公司详情
2. ✅ 公司不存在时应抛出错误
3. ✅ 应返回仅有运营者（无查看者）的详情
4. ✅ 应返回仅有查看者（无运营者）的详情
5. ✅ 应返回无用户的详情

### create() - 5 个测试
1. ✅ 应创建公司并关联运营者和查看者
2. ✅ 应创建无 viewer_ids 的公司
3. ✅ 应创建带空 viewer_ids 数组的公司
4. ✅ 未提供地址时 address 应为 null
5. ✅ 应将每个查看者关联到新公司

### update() - 6 个测试
1. ✅ 应更新公司信息并重新关联用户
2. ✅ 更新前应解除之前的 admin 和 view 用户关联
3. ✅ 应更新无 viewer_ids 的公司
4. ✅ 应更新带空 viewer_ids 数组的公司
5. ✅ 应以正确数据调用 company.update（包含 null address）
6. ✅ 应将每个查看者关联到更新的公司

### toggleStatus() - 5 个测试
1. ✅ 应启用公司（设置 status 为 true）
2. ✅ 应禁用公司（设置 status 为 false）
3. ✅ 公司不存在时应抛出错误
4. ✅ 切换后应返回映射后的公司对象
5. ✅ 应以正确的 where 条件调用 findUnique

### Edge cases - 6 个测试（本轮新增）
1. ✅ create: 验证 operator 关联使用正确的 companyId
2. ✅ create: 空 operator_ids 且无 viewer_ids 时不调用 user.update
3. ✅ create: 提供 address 时应保留原值
4. ✅ update: 验证 operator/viewer 关联使用正确的 companyId
5. ✅ update: 提供 address 时应保留原值
6. ✅ getById: 验证 findUnique 使用正确的 where 条件

## 关键覆盖分支
- `create`: `if (request.viewer_ids?.length)` → true/false 均覆盖
- `update`: `if (request.viewer_ids?.length)` → true/false 均覆盖
- `getById`: `if (!company)` → true/false 均覆盖
- `toggleStatus`: `if (!existing)` → true/false 均覆盖

## 测试策略
- 使用 `jest.mock` 模拟 `getPrisma` 返回值
- 每个测试通过构造 mock prisma 对象隔离数据库依赖
- 使用 `$transaction` mock 的 `mockImplementation` 模式直接执行回调函数
- 测试覆盖了正常路径、异常路径和边界条件

## 执行时间
2026-05-23
