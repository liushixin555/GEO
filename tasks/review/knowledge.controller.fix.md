# knowledge.controller.ts — 安全修复报告

**修复日期**: 2026-05-24（第2轮追加修复：2026-05-25）
**基于评审**: 架构评审、安全评审、Committer 评审、质量评审
**修复人**: 软件开发专家

---

## 修复清单

### P0 — 阻塞性安全修复（已修复）

| 编号 | 问题 | 修复内容 | 状态 |
|------|------|----------|------|
| SEC-C-01 / AC-4 | `checkBaseAccess` 空函数 | 实现了 company scope（检查用户 companyId 与知识库 company_id 匹配）和 project scope（调用 checkProjectOperator）的完整权限校验 | ✅ 已修复 |
| SEC-C-02 | 4 个 getById 端点无权限检查 (IDOR) | getKeyword/getPortrait/getDocument 添加 `await checkBaseAccess(baseId, userId, role)`；getImage 原已有 | ✅ 已修复 |

### P1 — 强烈建议修复（已修复）

| 编号 | 问题 | 修复内容 | 状态 |
|------|------|----------|------|
| SEC-H-01 | 全部 32 个 catch 块泄露 err.message | 统一改为 `err: unknown`，使用 `instanceof Error` 安全收窄，未知错误返回通用消息（如'获取关键词列表失败'而非 err.message） | ✅ 已修复 |
| SEC-M-01 | 5 个 mining 端点无鉴权 | listMinedKeywords/mineKeywords/saveMinedKeywords/toggleMinedKeywordsBatch/deleteMinedKeywords 全部添加 `checkBaseAccess` | ✅ 已修复 |
| SEC-M-02 | pageSize 无上限 | 所有 9 处 pageSize 统一改为 `Math.min(parseInt(...) \|\| 10, 100)`，限制最大 100 | ✅ 已修复 |
| AM-4 | 创建响应格式不一致 | 4 处 `res.status(201).json({code:0,...})` 统一改为 `created(res, item, '创建XX成功')` | ✅ 已修复 |

---

## 修复详情

### 1. checkBaseAccess 完整实现

```typescript
async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const base = await knowledgeBaseService.getById(baseId);
  if (base.scope === 'platform') return;
  if (base.scope === 'company') {
    // 查询用户所属公司，校验与知识库的 company_id 匹配
    const user = await prisma.user.findFirst({...});
    if (!user || user.companyId !== base.company_id) throw new Error('知识库不存在');
    return;
  }
  if (base.scope === 'project') {
    // 校验用户是否为项目操作者
    await checkProjectOperator(base.project_id!, userId, role);
    return;
  }
}
```

### 2. getById IDOR 修复

4 个 get{Resource} 函数添加了 `await checkBaseAccess(baseId, userId, role)` 调用。

### 3. 错误处理统一

- `err: any` → `err: unknown`
- 所有 catch 块使用 `instanceof Error` 安全收窄
- 未识别的错误返回通用中文消息，不泄露内部信息

### 4. pageSize 上限

- 所有分页端点限制 `pageSize` 最大为 100

### 5. 创建响应统一

- 使用 `created()` 工具函数替代手动 `res.status(201).json()`

---

## 测试验证

- 测试套件: 6 个测试文件，544 个测试用例全部通过
- 构建: `pnpm build:api` 成功
- 测试URL同步修复: image_url/file_url 从相对路径改为 `https://example.com/...` 格式，适配 schema URL 校验

---

## 未修复项（技术债务，需后续迭代）

| 编号 | 问题 | 原因 |
|------|------|------|
| AC-1 | 文件 906 行超 800 行上限 | 需要拆分为多个文件，属于重构 |
| AC-2 | 7 处 Prisma 直连 | 去重检查可接受，listInventory 需下沉到 Service 层 |
| AC-3 | listInventory 全量加载 | 需要数据库层分页改造 |
| SEC-H-03 | 输入验证不足 | 需要引入 Zod schema |
| SEC-H-04 | Prompt Injection | 需要 LLM 输入净化 |

---

## 第2轮追加修复（2026-05-25）

**基于**: `knowledge.controller.ts.md` 质量评审报告（C-1/H-5/H-7/M-2/M-5/M-6）

| 编号 | 问题 | 修复内容 | 状态 |
|------|------|----------|------|
| C-1 | expandKeywords 缺少 checkBaseAccess（越权漏洞） | 添加 `const { userId, role } = req.user!` + `await checkBaseAccess(baseId, userId, role)` + 错误处理改进 | ✅ 已修复 |
| H-5 | batchCreateKeywords 无数组长度上限 | 添加 `keywords.length > 500` 上限检查 | ✅ 已修复 |
| H-7 | createDocument file_size 无类型校验 | 添加 `typeof file_size !== 'number'` + 正数 + 有限数检查 | ✅ 已修复 |
| M-2 | pageSize 可能为负数或零 | 全部 9 处 `Math.min(...)` 改为 `Math.max(1, Math.min(...))` | ✅ 已修复 |
| M-5 | toggleMinedKeywordsBatch selected 无类型校验 | 添加 `typeof selected !== 'boolean'` 检查 | ✅ 已修复 |
| M-6 | mineKeywords source_type 无白名单 | 添加 `VALID_SOURCE_TYPES = ['all','document','portrait','image']` 白名单校验 | ✅ 已修复 |

### 测试验证

- 测试套件: knowledge.controller 270 测试用例全部通过
- 构建: `pnpm build:api` 成功
- Lint: `pnpm lint` 通过
- 已提交推送: commit `c28aafc`
