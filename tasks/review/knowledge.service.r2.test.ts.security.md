# knowledge.service.r2.test.ts 代码安全专家评审

**文件**: `tests/apis/knowledge.service.r2.test.ts`（429行，32个测试用例）
**被测文件**: `apis/service/impl/knowledge.service.impl.ts`（475行，5个服务类，41个公共方法）
**评审日期**: 2026-05-26
**评审类型**: 代码安全评审
**综合评分**: **3.8 / 10** — REJECT

---

## 评分维度

| 维度 | 得分 | 权重 | 加权分 |
|------|------|------|--------|
| 安全关键路径测试覆盖 | 2.0 | 25% | 0.50 |
| 输入验证与注入防护测试 | 1.0 | 20% | 0.20 |
| 授权边界与访问控制测试 | 3.0 | 20% | 0.60 |
| 数据泄露与软删除安全测试 | 4.0 | 15% | 0.60 |
| Mock 安全保真度 | 5.0 | 10% | 0.50 |
| 测试数据与凭据安全 | 7.0 | 10% | 0.70 |
| **加权总分** | | | **3.10 → 3.8** |

> 注：综合评分基于加权分 3.10 + 审查者对文档质量和结构清晰度的上调修正。

---

## 一、安全威胁模型概述

被测实现文件包含以下安全敏感操作：

```
┌─────────────────────────────────────────────────────┐
│           安全敏感操作清单                            │
├─────────────────────────────────────────────────────┤
│ 1. Raw SQL 查询/执行（$queryRaw / $executeRaw）     │
│    → SQL 注入风险                                    │
│ 2. 软删除过滤（deletedAt: null）                    │
│    → 已删除数据泄露风险                              │
│ 3. 跨实体访问控制（getAccessibleBaseIds）           │
│    → 水平越权/IDOR 风险                              │
│ 4. 用户输入直传数据库（keyword, title, content...）  │
│    → 注入/XSS/数据投毒风险                          │
│ 5. 文件 URL 存储（imageUrl, fileUrl）               │
│    → SSRF/开放重定向风险                             │
│ 6. 重复检测守门（checkDuplicate/checkDuplicateTitle）│
│    → 数据完整性/资源滥用风险                        │
│ 7. 跨服务事务（saveAndRemove: $transaction）        │
│    → 原子性破坏/数据不一致风险                      │
│ 8. 内容聚合截断（aggregateContent: 8000字符）       │
│    → 信息泄露/DoS 风险                              │
└─────────────────────────────────────────────────────┘
```

**测试对上述安全敏感操作的覆盖评估**：

| 操作 | 测试覆盖 | 安全验证程度 |
|------|---------|------------|
| Raw SQL | △ 仅验证调用次数 | **未验证参数化安全性** |
| 软删除过滤 | ✓ where 条件验证 | **未验证绕过场景** |
| 跨实体访问控制 | ✓ getAccessibleBaseIds mock | **未验证授权失败场景** |
| 用户输入透传 | ✓ 部分 | **未验证恶意输入** |
| 文件 URL | ✗ 零测试 | **完全未验证** |
| 重复检测守门 | ✗ 零测试 | **完全未验证** |
| 跨服务事务 | ✗ 零测试 | **完全未验证** |
| 内容聚合截断 | ✗ 零测试 | **完全未验证** |

---

## 二、问题清单

### CRITICAL（致命级）

#### C-1: Raw SQL 注入防护零验证
**严重度**: CRITICAL | **测试行号**: 97-103, 158-166 | **实现行号**: 64-71, 132-145

实现文件中 `syncExpandedWords` 和 `getById` 使用 Prisma tagged template literals 执行 Raw SQL：

```typescript
// impl 行 64: getById - 查询
await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE id = ${id} AND deleted_at IS NULL`;

// impl 行 132-135: syncExpandedWords - 先删除后插入
await prisma.$executeRaw`UPDATE keyword_expanded_words SET deleted_at = NOW() WHERE keyword_id = ${keywordId} AND deleted_at IS NULL`;
await prisma.$executeRaw`INSERT INTO keyword_expanded_words (keyword_id, word, selected, created_at, updated_at) VALUES (${keywordId}, ${w.word}, ${w.selected}, NOW(), NOW())`;
```

**测试缺陷**：
1. `getById` 测试（test 行 97-103）仅验证 `$queryRaw` 被调用 2 次，**未验证 SQL 语句内容**和参数绑定方式
2. `syncExpandedWords` 测试（test 行 158-166）仅验证 `$executeRaw` 被调用 4 次，**未验证各次调用的 SQL 模板和参数**
3. 特别是 `syncExpandedWords` 中的 INSERT 语句直接插入 `w.word`（来自用户输入的 `expanded_words[].word`），**若 Prisma tagged template 的参数化机制失效，则存在 SQL 注入风险**

```typescript
// 缺失：应验证 SQL 参数化
it('syncExpandedWords should parameterize word values via tagged template', async () => {
  const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
  const mockQueryRaw = jest.fn().mockResolvedValue([]);
  mockedGetPrisma.mockReturnValue({ $executeRaw: mockExecuteRaw, $queryRaw: mockQueryRaw } as any);
  const maliciousWord = "'; DROP TABLE keyword_expanded_words; --";
  await service.syncExpandedWords(5, 10, [{ word: maliciousWord, selected: true }], 1);
  // 验证 word 作为参数传入而非拼接到 SQL 字符串
  const insertCall = mockExecuteRaw.mock.calls[1]; // 第2次调用是 INSERT
  expect(insertCall[0]).not.toContain('DROP TABLE'); // tagged template 的原始数组不含拼接
});
```

**安全影响**: 虽然使用了 Prisma tagged template literals（自动参数化），但测试未验证此安全机制的有效性。若未来重构为字符串拼接或模板字面量，测试不会捕获 SQL 注入回归。

---

#### C-2: 重复检测安全守门零测试——checkDuplicate / checkDuplicateTitle
**严重度**: CRITICAL | **实现行号**: 273-290, 358-371

`ImageServiceImpl.checkDuplicate` 和 `DocumentServiceImpl.checkDuplicate` 是 controller 层调用的数据完整性安全守门，用于防止重复资源创建。测试完全未涉及：

```typescript
// impl 行 273-283: ImageServiceImpl.checkDuplicate
async checkDuplicate(baseId: number, title: string, imageUrl: string): Promise<void> {
  const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
  if (dupTitle) throw new ConflictError('该知识库已存在相同标题的图片');
  const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl, deletedAt: null } });
  if (dupUrl) throw new ConflictError('该知识库已存在相同的图片');
}

// impl 行 285-290: ImageServiceImpl.checkDuplicateTitle
async checkDuplicateTitle(baseId: number, title: string, excludeId: number): Promise<void> {
  const dup = await prisma.knowledgeImage.findFirst({ where: { baseId, title, id: { not: excludeId }, deletedAt: null } });
  if (dup) throw new ConflictError('该知识库已存在相同标题的图片');
}
```

**安全缺陷**：
1. `checkDuplicate` 同时检查标题和 URL，防止资源重复创建——**零测试意味着此安全防线可被静默移除**
2. `checkDuplicateTitle` 使用 `id: { not: excludeId }` 排除自身——**若 `excludeId` 为负数或非数字，`not` 条件可能失效，导致所有更新操作都报冲突**
3. **DocumentServiceImpl 的同名方法有相同问题**，且 `fileUrl` 的验证更关键（文件存储唯一性）
4. 攻击者可通过绕过重复检测来**耗尽存储资源**（重复上传同一图片/文档）

```typescript
// 缺失：应测试重复检测
it('checkDuplicate should throw ConflictError when title exists', async () => {
  const mockFindFirst = jest.fn().mockResolvedValue({ id: 1 });
  mockedGetPrisma.mockReturnValue({ knowledgeImage: { findFirst: mockFindFirst } } as any);
  await expect(service.checkDuplicate(10, 'existing-title', 'https://a.com/img.png'))
    .rejects.toThrow(ConflictError);
});

it('checkDuplicate should pass when no duplicate found', async () => {
  const mockFindFirst = jest.fn().mockResolvedValue(null).mockResolvedValue(null);
  mockedGetPrisma.mockReturnValue({ knowledgeImage: { findFirst: mockFindFirst } } as any);
  await expect(service.checkDuplicate(10, 'new-title', 'https://a.com/new.png'))
    .resolves.toBeUndefined();
});
```

---

#### C-3: 跨服务事务 saveAndRemove 零安全验证
**严重度**: CRITICAL | **实现行号**: 458-473

`saveAndRemove` 是唯一使用 `$transaction` 的方法，涉及跨服务操作：

```typescript
// impl 行 458-473
async saveAndRemove(baseId, keywords, userId, keywordService): Promise<...> {
  const prisma = getPrisma();
  return prisma.$transaction(async () => {
    const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');
    await prisma.minedKeyword.updateMany({
      where: { baseId, keyword: { in: keywords }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result;
  });
}
```

**安全缺陷**：
1. **事务原子性**: `batchCreate` 成功但 `updateMany` 失败时，应回滚所有操作——零测试无法验证
2. **跨服务依赖注入**: `keywordService` 参数来自外部调用者，若传入恶意实现可导致数据不一致——零测试
3. **关键字数组无长度限制**: `keywords` 数组直接传入 `{ in: keywords }`，无上限检查——大量关键词可能导致数据库性能问题（DoS 向量）
4. **seedWord 硬编码**: 传入 `'关键词挖掘'` 作为固定 seedWord，测试应验证此业务常量不被篡改

---

### HIGH（高优先级）

#### H-1: 用户输入恶意内容零测试——注入/XSS 向量
**严重度**: HIGH | **实现行号**: 75, 162, 189, 246, 336

所有 `create` / `update` / `batchCreate` 方法直接将用户输入传入 Prisma `create` / `update` 调用：

```typescript
// impl 行 75: keyword 直接来自 request.keyword
const item = await prisma.knowledgeKeyword.create({
  data: { baseId, keyword: request.keyword, createdBy: userId },
});
```

测试中所有输入均为正常字符串（`'mapped'`, `'empty'`, `'nolist'`, `'w'` 等），**无任何恶意输入测试**：

```typescript
// 缺失：应测试恶意输入
const xssPayloads = [
  '<script>alert("xss")</script>',
  '"><img src=x onerror=alert(1)>',
  "' OR '1'='1",
  '${7*7}',
  '../../../etc/passwd',
];
// 至少应验证 Prisma 调用是否正确转义这些输入
```

**安全影响**: 虽然使用 Prisma ORM 本身提供参数化防护，但测试未验证：
1. 输入是否在存储前被正确处理（转义/清洗）
2. 返回值中的恶意内容是否被原样透传（下游消费者可能触发 XSS）
3. `description` / `content` 等富文本字段的特殊字符处理

---

#### H-2: 软删除安全边界测试不足
**严重度**: HIGH | **测试行号**: 168-176 | **实现行号**: 120-122

测试验证了 `delete` 方法设置 `deletedAt` 为 `Date` 实例：

```typescript
it('delete should pass Date instance as deletedAt', async () => {
  // ...
  const updateCall = mockUpdate.mock.calls[0][0];
  expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
});
```

**安全缺陷**：
1. **仅 KeywordServiceImpl 的 delete 有测试**，其余 4 个服务的 delete 未验证 `deletedAt` 设置
2. **未测试已删除记录的操作**: 对已软删除的记录调用 `update` / `getById` 时是否正确拒绝
3. **DocumentServiceImpl.list 故意不过滤 deletedAt**（test 行 303-311 验证了此行为），但这意味着**已删除文档在列表中可见**——这是一个安全漏洞还是设计决策，测试未明确

```typescript
// 缺失：应测试已删除记录不可操作
it('update should reject soft-deleted record', async () => {
  const mockFindFirst = jest.fn().mockResolvedValue(null); // 模拟已删除
  mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findFirst: mockFindFirst } } as any);
  await expect(service.update(1, { keyword: 'test' }))
    .rejects.toThrow(NotFoundError); // 应抛出 NotFoundError
});
```

---

#### H-3: 跨实体访问控制（listByProject）授权边界验证不足
**严重度**: HIGH | **测试行号**: 85-95, 219-227, 288-296, 357-365

测试通过 `(service as any).kbService` 直接访问私有属性来设置 mock：

```typescript
it('listByProject should pass correct orderBy/skip/take', async () => {
  const mockKbService = (service as any).kbService;
  mockKbService.getAccessibleBaseIds.mockResolvedValue([10]);
  // ...
});
```

**安全缺陷**：
1. **仅验证了授权成功路径**（返回 baseIds），**未验证授权失败路径**（返回空数组时是否安全短路）
2. **未验证 getAccessibleBaseIds 被以正确参数调用**（projectId 是否正确传递）
3. **未测试跨项目越权**: 如果 `getAccessibleBaseIds` 被错误实现返回了其他项目的 baseId，测试不会发现
4. `(service as any).kbService` 绕过了 TypeScript 类型系统，mock 可能与真实方法签名不一致

```typescript
// 缺失：应验证授权失败路径
it('listByProject should return empty when no accessible bases', async () => {
  const mockKbService = (service as any).kbService;
  mockKbService.getAccessibleBaseIds.mockResolvedValue([]); // 无授权
  const result = await service.listByProject(999, 1, 10);
  expect(result).toEqual({ list: [], total: 0 });
  // 不应调用任何 Prisma 查询
});

// 缺失：应验证 projectId 正确传递
it('listByProject should pass correct projectId to getAccessibleBaseIds', async () => {
  const mockKbService = (service as any).kbService;
  mockKbService.getAccessibleBaseIds.mockResolvedValue([]);
  await service.listByProject(42, 1, 10);
  expect(mockKbService.getAccessibleBaseIds).toHaveBeenCalledWith(42);
});
```

---

#### H-4: 文件 URL 安全验证完全缺失
**严重度**: HIGH | **实现行号**: 246, 252, 336

`ImageServiceImpl.create` 和 `DocumentServiceImpl.create` 接受用户提供的 URL（`image_url` / `file_url`）并直接存入数据库：

```typescript
// impl 行 246: imageUrl 直接透传
data: { baseId, title: request.title, description: request.description || null, imageUrl: request.image_url, createdBy: userId },

// impl 行 336: fileUrl 直接透传
fileUrl: request.file_url,
```

**安全缺陷**：
1. **无 URL scheme 验证测试**: 应验证 `javascript:` / `data:` / `file://` 等危险 scheme 是否被允许
2. **无 SSRF 防护测试**: `http://localhost` / `http://169.254.169.254`（AWS 元数据）等内部地址
3. **无 URL 格式验证测试**: 非法 URL（如空字符串、超长 URL）是否被正确处理
4. 测试中 `create` 仅使用正常的 `https://example.com/img.png` URL

```typescript
// 缺失：应测试 URL 安全
const dangerousUrls = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'file:///etc/passwd',
  'http://169.254.169.254/latest/meta-data/',
  'http://localhost:5432/',
];
```

**注**: 虽然 URL 验证应在 controller 层实现，但 service 层测试应验证 service 对恶意 URL 的处理策略。

---

### MEDIUM（中优先级）

#### M-1: 环境变量 JWT_SECRET 硬编码
**严重度**: MEDIUM | **测试行号**: 4

```typescript
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
```

**安全分析**：
1. 虽然测试文件中设置环境变量是标准做法，但该测试文件并不涉及 JWT 验证逻辑，这两个环境变量**完全未在测试中使用**
2. 若测试运行器在全局环境共享（如 CI 并行测试），`JWT_SECRET` 可能泄漏到其他测试进程
3. `'test-secret'` 作为密钥值过于简单，虽然仅用于测试，但若测试配置不当运行在生产环境将造成严重安全事故

**建议**: 移除未使用的 `JWT_SECRET` / `JWT_EXPIRES_IN` 设置，或改为在独立的 setup 文件中统一管理。

---

#### M-2: 内容聚合 aggregateContent 零安全测试
**严重度**: MEDIUM | **实现行号**: 404-425

```typescript
async aggregateContent(baseId: number, sourceType: string): Promise<string> {
  // ...
  return contentParts.join('\n').substring(0, 8000);
}
```

**安全缺陷**：
1. **sourceType 参数无枚举验证**: 接受任意 string 值，若传入非预期值（如 `'all'` 以外的值），所有 if 分支都不执行，返回空字符串——但这不是安全错误，只是浪费资源
2. **8000 字符截断**: 虽有截断，但查询本身无分页限制，`findMany` 可能返回大量数据——**潜在 DoS 向量**
3. **内容直接拼接**: 文档标题、描述、画像内容直接拼入字符串，若下游将此内容用于 LLM 提示词，可能存在**提示注入**风险

---

#### M-3: batchCreate / addMinedKeywords 无批量操作限制测试
**严重度**: MEDIUM | **实现行号**: 85-100, 394-406

```typescript
// impl 行 85-100: batchCreate
const newKeywords = keywords.filter(k => !existingSet.has(k));
if (newKeywords.length > 0) {
  await prisma.knowledgeKeyword.createMany({
    data: newKeywords.map(keyword => ({ baseId, keyword, seedWord: seedWord || null, createdBy: userId })),
  });
}
```

**安全缺陷**：
1. `keywords` 数组无长度上限——传入 10000 个关键词将导致大量数据库写入
2. `createMany` 使用 `skipDuplicates` 但不验证单条数据长度——超长 keyword 字符串可能导致数据库错误
3. 测试仅使用 `['w']` / `['A', 'B']` 小数组，**未验证大批量场景**

---

#### M-4: DocumentServiceImpl.list 与 listByProject 的 deletedAt 不一致——潜在数据泄露
**严重度**: MEDIUM | **测试行号**: 303-311 | **实现行号**: 297-311, 317-327

测试正确识别了 `DocumentServiceImpl.list` 不包含 `deletedAt: null` 过滤：

```typescript
it('list should NOT include deletedAt filter', async () => {
  // ...
  const where = mockFindMany.mock.calls[0][0].where;
  expect(where).toEqual({ baseId: 10 });
  expect(where).not.toHaveProperty('deletedAt');
});
```

**安全风险**：
1. `list` 不过滤已删除文档 → **已删除文档对同一 baseId 用户可见**
2. `listByProject` 过滤 `deletedAt: null` → 同一服务的行为不一致
3. 测试记录了这一行为但**未将其标记为安全风险**
4. 若删除文档是为了移除敏感信息（如错误上传的机密文件），`list` 仍会泄露该文档

**建议**: 测试应明确标注此不一致为安全风险，或验证这是有意的业务决策。

---

#### M-5: Mock 安全保真度不足——getPrisma 返回值过度简化
**严重度**: MEDIUM | **测试行号**: 80, 90, 99, 108 等

几乎所有测试使用 `mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findMany: mockFindMany, count: mockCount } } as any)`。

**安全问题**：
1. 使用 `as any` 强制类型转换，绕过了 Prisma Client 的类型检查
2. Mock 返回值仅包含当前测试需要的方法，**不模拟 Prisma 的安全特性**（如 `$transaction` 的隔离级别、`$queryRaw` 的参数化）
3. 若 Prisma Client 增加了安全中间件（如审计日志、字段级加密），测试不会感知

---

### LOW（低优先级）

#### L-1: 测试数据中无敏感信息泄露风险
**安全等级**: INFO

测试中的 URL（`https://example.com/img.png`、`https://example.com/doc.pdf`）使用 example.com 域名，符合安全实践。无真实凭据、无内部 IP、无敏感文件路径。

#### L-2: jest.mock 隔离边界清晰
**安全等级**: INFO

`jest.mock('../../apis/utils/db.util')` 和 `jest.mock('../../apis/service/impl/knowledge-base.service.impl')` 正确隔离了数据库和外部依赖，无 mock 泄漏到其他测试文件的风险（每个文件独立 mock）。

#### L-3: makePrisma* Helper 工厂不引入安全债务
**安全等级**: INFO

Helper 函数使用合理的默认值，无硬编码凭据或敏感信息。`overrides: Record<string, any>` 虽失去类型安全，但不引入安全风险。

---

## 三、安全风险矩阵

```
                     高影响
                       │
    C-2 重复检测守门   │    C-1 Raw SQL 注入
    C-3 事务原子性     │    H-4 文件 URL SSRF
    H-1 恶意输入       │    H-3 授权边界
                       │
  ─────────────────────┼───────────────────── 高概率
                       │
    M-4 deletedAt 泄露  │    H-2 软删除边界
    M-3 批量操作 DoS   │    M-2 内容聚合截断
    M-1 环境变量        │
                       │
                     低影响
```

---

## 四、被测实现与测试安全覆盖对照表

| 安全敏感操作 | 实现行号 | 测试覆盖 | 安全验证 | 缺失项 |
|------------|---------|---------|---------|--------|
| Raw SQL 参数化 | 64-71, 132-145 | △ 调用次数 | **未验证** | C-1: SQL 模板和参数绑定 |
| 软删除过滤 | 各处 | ✓ where 条件 | 部分 | H-2: 绕过场景、其他4个服务 |
| NotFoundError 抛出 | 67, 114, 128 等 | ✗ | **未验证** | 全部 5 个服务的错误路径 |
| ConflictError 抛出 | 273-290, 358-371 | ✗ | **未验证** | C-2: checkDuplicate 全系列 |
| 事务原子性 | 458-473 | ✗ | **未验证** | C-3: saveAndRemove 完整测试 |
| 授权边界 | 51, 167, 233, 316 | △ 仅成功路径 | **不足** | H-3: 失败路径、projectId 传递 |
| URL 安全 | 246, 252, 336 | ✗ | **未验证** | H-4: scheme 验证、SSRF 防护 |
| 恶意输入 | 所有 create/update | ✗ | **未验证** | H-1: XSS/SQL 注入向量 |
| 内容截断 | 425 | ✗ | **未验证** | M-2: 8000 字符边界 |
| 批量操作限制 | 85-100, 394-406 | △ 小数组 | **不足** | M-3: 大数组 DoS |
| deletedAt 不一致 | 297-327 | ✓ 行为验证 | **未标注风险** | M-4: 安全影响评估 |

---

## 五、修复优先级矩阵

| 优先级 | 编号 | 工作量 | 修复建议 |
|--------|------|--------|---------|
| P0 | C-1 | 2h | 为 `$queryRaw` / `$executeRaw` 调用添加参数化验证测试，确认使用 tagged template 而非字符串拼接 |
| P0 | C-2 | 2h | 补全 checkDuplicate / checkDuplicateTitle 四个方法的成功/失败测试 |
| P0 | C-3 | 1.5h | 补全 saveAndRemove 事务测试：成功路径、回滚路径、跨服务依赖验证 |
| P1 | H-1 | 1.5h | 为 create/update 添加恶意输入测试（XSS payload、SQL 注入向量） |
| P1 | H-2 | 1h | 为其余 4 个服务补全 delete 测试 + 已删除记录操作拒绝测试 |
| P1 | H-3 | 1h | 为 listByProject 添加授权失败路径测试 + projectId 传递验证 |
| P1 | H-4 | 1h | 为 URL 字段添加 scheme 验证测试 |
| P2 | M-1 | 0.5h | 移除未使用的 JWT_SECRET 设置 |
| P2 | M-2 | 1h | 补全 aggregateContent 测试（截断边界、sourceType 枚举） |
| P2 | M-3 | 0.5h | 为 batchCreate/addMinedKeywords 添加大批量场景测试 |
| P2 | M-4 | 0.5h | 为 DocumentServiceImpl.list 无 deletedAt 行为添加安全风险标注测试 |
| P2 | M-5 | 1h | 优化 Mock 保真度，减少 `as any` 使用 |

**总修复工作量**: ~13h

---

## 六、安全测试增强建议

### 6.1 建议：安全测试基类

```typescript
// tests/apis/helpers/security-test-base.ts
const MALICIOUS_STRINGS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '${7*7}',
  '../../../etc/passwd',
  'javascript:alert(1)',
];

function expectMaliciousInputHandled(
  createFn: (input: string) => Promise<any>,
  fieldName: string
): void {
  MALICIOUS_STRINGS.forEach(payload => {
    it(`should handle malicious ${fieldName}: ${payload.substring(0, 20)}...`, async () => {
      // 验证 Prisma 参数化处理恶意输入，不抛出未预期异常
    });
  });
}
```

### 6.2 建议：Raw SQL 安全测试模板

```typescript
function expectRawSqlParameterized(
  callFn: () => Promise<any>,
  getExecuteRawMock: () => jest.Mock
): void {
  it('should use tagged template (parameterized) for raw SQL', async () => {
    await callFn();
    const mock = getExecuteRawMock();
    mock.mock.calls.forEach(call => {
      // tagged template 的第一个参数是 TemplateStringsArray
      expect(Array.isArray(call[0]) || call[0]?.raw).toBeDefined();
      // 非字符串拼接
      expect(typeof call[0]).not.toBe('string');
    });
  });
}
```

### 6.3 建议：授权边界测试模板

```typescript
function expectAuthorizationBoundary(
  serviceFn: () => Promise<any>,
  setupNoAccess: () => void
): void {
  it('should return empty when user has no access', async () => {
    setupNoAccess();
    const result = await serviceFn();
    expect(result).toEqual({ list: [], total: 0 });
  });
}
```

---

## 七、结论

### 安全优势
- S-1: Mock 隔离策略合理，无 mock 泄漏风险
- S-2: 测试数据无敏感信息泄露（URL 使用 example.com）
- S-3: 成功验证了部分 where 条件中的 `deletedAt: null` 过滤
- S-4: 正确识别了 DocumentServiceImpl.list 不含 deletedAt 过滤的行为

### 安全风险
- R-1: Raw SQL 参数化安全性零验证（C-1）
- R-2: 数据完整性守门方法（checkDuplicate）零测试，可被静默移除（C-2）
- R-3: 唯一事务方法零测试，原子性无保障（C-3）
- R-4: 用户输入（XSS/注入向量）零安全测试（H-1）
- R-5: 文件 URL（SSRF/开放重定向）零安全测试（H-4）
- R-6: 41 个公共方法中 12 个零测试，其中 8 个涉及安全敏感操作

### 评审结论

**REJECT** — 测试文件在安全维度存在严重缺陷。41 个公共方法中 12 个零覆盖，其中包含 4 个数据完整性守门方法（checkDuplicate/checkDuplicateTitle）、1 个跨服务事务方法（saveAndRemove）和 1 个内容聚合方法（aggregateContent）。32 个测试用例全部走 happy path，无任何错误路径、恶意输入或授权边界测试。

从安全测试角度看，该测试套件提供的信心约为 **30%**：
- **已验证**: 分页计算、部分 where 条件、基本字段映射
- **未验证**: SQL 注入防护、重复检测、事务原子性、授权失败、恶意输入、URL 安全、软删除绕过

建议修复 C-1 ~ C-3 后重新评审。预期安全评分可在修复后提升至 6.0+。
