# apis/controller/index.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（认证授权 + 输入验证 + 注入攻击 + 信息泄露 + 路径遍历 + SSRF）
**文件路径**: `apis/controller/index.ts`
**代码行数**: 8 行（barrel 文件）
**关联文件**: 7 个已导出控制器 + 8 个未导出控制器 + `apis/middleware/` + `apis/app.ts`

---

## 一、评审范围

`apis/controller/index.ts` 是 Barrel 聚合导出文件，本身仅 8 行 `export` 语句。本次安全评审以此文件为入口，**深入审查所有关联控制器、中间件、服务层的代码安全问题**。

### 关联审查清单

| 文件 | 安全关注点 |
|------|-----------|
| `auth.controller.ts` | 认证流程、登录暴力破解防护 |
| `company.controller.ts` | 输入验证、SQL 注入 |
| `user.controller.ts` | 角色验证、密码强度 |
| `skills.controller.ts` | 文件上传、Zip Slip 路径遍历 |
| `llm-model.controller.ts` | API 密钥泄露、SSRF |
| `system-config.controller.ts` | 配置篡改、白名单 |
| `todo.controller.ts` | 越权查询、IDOR |
| `middleware/auth.middleware.ts` | JWT 验证 |
| `middleware/anti-crawl.middleware.ts` | 反爬虫 |
| `middleware/rate-limit.middleware.ts` | 限流 |

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: LLM 模型 API 密钥通过 API 响应泄露

**位置**: `apis/map/index.ts:49` (`mapLlmModel`) → `apis/controller/llm-model.controller.ts`

**问题描述**: `mapLlmModel` 函数将原始 `apiKey` 值原样映射到返回给前端的 DTO 中。`GET /api/llm-models` 和 `GET /api/llm-models/:id` 均会返回完整的 LLM API 密钥。

**攻击场景**:
1. sysadmin 角色用户调用 `GET /api/llm-models`
2. 获取到 OpenAI / Anthropic 等付费服务的完整 API 密钥
3. 密钥可被用于未授权调用、转卖或滥用

**影响**: 付费服务密钥泄露 → 财务损失 + 数据泄露

**修复建议**:
```typescript
// mapLlmModel 中脱敏处理
apiKey: original.apiKey ? `${original.apiKey.slice(0, 4)}****${original.apiKey.slice(-4)}` : ''
```

---

#### C-2: Skills 上传存在 Zip Slip 路径遍历漏洞

**位置**: `apis/controller/skills.controller.ts:127`

**问题描述**: `createSkills` 使用 `AdmZip.extractAllTo()` 解压用户上传的 zip 文件：

```typescript
zip.extractAllTo(SKILLS_DIR, true);  // 第127行 — 无路径校验
```

`extractAllTo` 不验证 zip 条目的路径。恶意 zip 文件可包含 `../../etc/cron.d/malicious` 等路径，导致文件被写入 skills 目录之外。

**二次风险**: 第198行 `existing.skill_dir` 直接用于 `path.join` 构建删除路径，若数据库值被篡改可触发任意目录删除。

**攻击场景**:
1. 攻击者构造含 `../../../app.js` 路径的 zip 文件上传
2. `extractAllTo` 将恶意文件写到 skills 目录外
3. 覆盖关键文件或植入后门

**修复建议**:
```typescript
// 解压后逐条验证路径
const entries = zip.getEntries();
for (const entry of entries) {
  const resolved = path.resolve(SKILLS_DIR, entry.entryName);
  if (!resolved.startsWith(path.resolve(SKILLS_DIR))) {
    throw new Error('非法路径');
  }
}
zip.extractAllTo(SKILLS_DIR, true);
```

---

#### C-3: todo.controller 绕权查询（IDOR）

**位置**: `apis/controller/todo.controller.ts:162-248`

**问题描述**: `getObjectOptions` 和 `getAssigneeCandidates` 绕过 service 层，直接用 `getPrisma()` 执行数据库查询。接收 `projectId` 参数但未验证当前用户是否有权访问该项目。

```typescript
// 第162行 — 无项目权限校验
const projectId = parseInt(req.query.projectId as string);
```

**攻击场景**: sysadmin/admin 角色用户可枚举 projectId 查询任意项目的对象选项和用户候选人。

**修复建议**: 查询前验证用户是否有权访问该 projectId。

---

### HIGH 级别

#### H-1: 多个控制器错误处理泄露内部信息

**位置**: `todo.controller.ts` (第35/50/60/205/246行), `system-config.controller.ts` (第12/34行), `llm-model.controller.ts` (第12/52/68/84行)

**问题描述**: catch 块使用 `err.message || '...'` 模式，将原始错误消息返回给客户端：

```typescript
fail(res, 500, err.message || '获取待办列表失败');
```

数据库连接错误、Prisma 内部错误等含技术细节的消息会被暴露给前端。

**对比**: `company.controller.ts` 和 `auth.controller.ts` 使用固定错误消息，做法正确。

**修复建议**: 统一使用固定错误消息，`err.message` 仅记录到服务端日志。

---

#### H-2: 桶文件导出不完整 — 9 个函数缺失

**位置**: `apis/controller/index.ts` (第1-7行)

**问题描述**: 以下在 `app.ts` 中注册路由的函数未在 barrel 中导出：

| 缺失函数 | 来源控制器 |
|----------|-----------|
| `saveSelection`, `getAccessibleCompanies`, `getCompanyDetail`, `getAccessibleProjects`, `getContext` | auth.controller |
| `toggleCompanyStatus` | company.controller |
| `uploadSkillMiddleware` | skills.controller |
| `getObjectOptions`, `getAssigneeCandidates` | todo.controller |

**安全影响**: 当前 app.ts 直接从各模块导入（不影响运行），但若未来切换到从 barrel 导入，缺失的函数会导致运行时 404，而攻击者可能利用路由已注册但处理函数为 undefined 的状态。

---

#### H-3: user.controller 缺少角色字段值验证

**位置**: `apis/controller/user.controller.ts:40-44`

```typescript
const { username, password, cn_name, role } = req.body;
if (!username || !password || !cn_name || !role) {
  fail(res, 400, '用户名、密码、姓名、角色不能为空');
  return;
}
// role 值未校验 — 应限制为 'sysadmin' | 'admin' | 'view'
```

虽然 Prisma enum 在数据库层阻止非法值，但应在应用层提前验证，返回明确的 400 错误而非 500。

**修复建议**:
```typescript
if (!['sysadmin', 'admin', 'view'].includes(role)) {
  fail(res, 400, '角色值不合法');
  return;
}
```

---

#### H-4: user.controller 缺少密码强度验证

**位置**: `apis/controller/user.controller.ts:40`

创建用户时仅检查密码是否为空，无最小长度/复杂度要求。弱密码易被暴力破解。

---

#### H-5: llm-model.controller 缺少 URL 格式验证

**位置**: `apis/controller/llm-model.controller.ts:43-46`

`base_url` 仅检查非空，不验证是否为合法 URL。

**攻击场景**: 存入 `http://169.254.169.254`（AWS 元数据）或 `http://127.0.0.1:xxxx` 等内网地址，后续调用 LLM 时触发 SSRF。

**修复建议**: 使用 `new URL(base_url)` 验证格式，并检查协议为 `http:` 或 `https:`，拒绝内网地址。

---

#### H-6: system-config.controller 缺少 config_key 白名单

**位置**: `apis/controller/system-config.controller.ts:16-31`

`updateSystemConfigs` 接受任意 `config_key` 批量 upsert，无白名单限制。攻击者可创建新配置项或篡改不应被修改的关键配置。

---

### MEDIUM 级别

#### M-1: 登录缺少账户锁定机制

**位置**: `apis/controller/auth.controller.ts:36-61`

虽有全局 rate-limit（100次/分钟）和 anti-crawl（200次/分钟），但无针对单用户名的暴力破解防护。攻击者可慢速暴力破解（每分钟 100 次对弱密码足够）。

---

#### M-2: pageSize 参数无上限限制

**位置**: `todo.controller.ts:10-11`, `user.controller.ts:9-10`, `skills.controller.ts:67-68`

```typescript
const pageSize = parseInt(req.query.pageSize as string) || 10;
// 用户可传 pageSize=999999 导致大量数据返回
```

**修复建议**: `Math.min(pageSize, 100)`

---

#### M-3: search 参数无长度限制

**位置**: `todo.controller.ts:14`, `user.controller.ts:11`, `skills.controller.ts:69`

超长 search 字符串可能导致数据库 `contains` 查询性能问题。

---

#### M-4: skills.controller 解压失败未清理残留文件

**位置**: `apis/controller/skills.controller.ts:94-158`

数据库操作失败时，已解压到 `skills/` 的文件不会被清理（finally 块只清理临时 zip 文件）。

---

#### M-5: 反爬虫 User-Agent 检查过于简单

**位置**: `apis/middleware/anti-crawl.middleware.ts:58-62`

仅验证 `ua.length < 10`，任何超过 10 字符的 User-Agent 均可通过，实际防护价值有限。

---

#### M-6: auth.controller 登录错误信息区分度

**位置**: `apis/service/impl/auth.service.impl.ts:24-30`

`LoginSelectionError`（"没有权限访问任何公司"）以 403 返回，攻击者可据此确认用户名存在但无权访问。

---

## 三、已有安全措施（正面评价）

| 安全机制 | 实现质量 | 说明 |
|----------|---------|------|
| JWT 认证中间件 | 良好 | Bearer token 提取，过期返回 401 |
| 角色中间件 | 良好 | 路由级 RBAC，每个端点限制角色 |
| Helmet | 良好 | 安全响应头已配置 |
| CORS | 良好 | 白名单模式，严格验证 origin |
| Rate Limiting | 良好 | 全局限流 100次/分钟 |
| Anti-Crawl | 一般 | IP 追踪+封锁，但 UA 检查偏弱 |
| 密码存储 | 良好 | bcrypt cost=10 |
| SQL 注入防护 | 良好 | Prisma ORM 参数化查询，无字符串拼接 |
| 请求体大小限制 | 良好 | JSON 10MB, 文件上传 50MB |
| Swagger | 良好 | 仅非生产环境启用 |
| 配置冻结 | 良好 | `deepFreeze` 防止运行时篡改 |
| 全局错误处理 | 良好 | 4 参数签名处理器不泄露具体错误 |

---

## 四、安全度量

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 7/10 | JWT+RBAC 健全，但存在 IDOR 和账户锁定缺失 |
| 输入验证 | 5/10 | 多个控制器缺少格式/长度/白名单验证 |
| 数据保护 | 4/10 | API 密钥明文返回前端，未脱敏 |
| 文件上传安全 | 3/10 | Zip Slip 漏洞，解压残留未清理 |
| 错误处理 | 6/10 | 部分控制器泄露内部错误信息 |
| 注入防护 | 8/10 | Prisma ORM 有效防护 SQL 注入 |
| 通信安全 | 8/10 | Helmet + CORS 白名单配置完善 |

**综合安全评分: 5.9/10**

---

## 五、修复优先级路线图

### 立即修复（P0 — 安全漏洞）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| C-1: API 密钥脱敏 | 财务损失 | 小 |
| C-2: Zip Slip 修复 | 任意文件写入 | 中 |
| H-1: 错误信息统一 | 信息泄露 | 中 |

### 短期修复（P1 — 安全加固）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| H-3: 角色值验证 | 越权创建 | 小 |
| H-4: 密码强度验证 | 暴力破解 | 小 |
| H-5: URL 格式验证 | SSRF | 小 |
| H-6: config_key 白名单 | 配置篡改 | 小 |
| C-3: todo 越权查询 | IDOR | 中 |

### 中期改进（P2 — 安全增强）

| 问题 | 风险 | 工作量 |
|------|------|--------|
| M-1: 账户锁定机制 | 暴力破解 | 中 |
| M-2: pageSize 上限 | DoS | 小 |
| M-3: search 长度限制 | DoS | 小 |
| M-4: 解压残留清理 | 资源泄露 | 小 |

---

## 六、评审结论

**判定: 不通过 — 存在 3 个 CRITICAL + 6 个 HIGH 安全问题**

`apis/controller/index.ts` 作为 Barrel 文件本身无安全风险，但作为控制器层入口暴露了严重的下游安全问题：

1. **最严重**: LLM API 密钥明文返回前端（C-1）和 Zip Slip 路径遍历（C-2）均为可被直接利用的安全漏洞
2. **系统性**: 输入验证缺失是跨控制器共性问题（H-3/H-4/H-5/H-6），说明缺少统一的请求验证层
3. **已有基础**: 认证、授权、SQL 注入防护等基础安全措施已到位，修复增量问题可快速提升安全水位

**建议**: 优先修复 C-1 和 C-2（预估 1-2 天），然后系统性地补充输入验证层。

---

*代码安全专家评审完成 — 2026-05-24*

---

## 七、Committer 审核意见

**审核日期**: 2026-05-24
**审核角色**: 代码 Committer 审核专家
**审核对象**: 上述安全专家评审报告

### 7.1 评审质量评价

| 评审维度 | 评分 | 说明 |
|----------|------|------|
| 覆盖范围 | 9/10 | 以 barrel 文件为入口，深入审查了全部关联控制器和中间件，范围全面 |
| 问题准确性 | 8/10 | 6/7 项核心发现经源码验证确认有效，仅 H-2（导出缺失）与实际不符 |
| 风险评级 | 9/10 | CRITICAL/HIGH/MEDIUM 分级合理，优先级路线图可操作 |
| 修复建议 | 7/10 | 大部分建议直接可用，但部分修复建议过于简略（如 C-3 IDOR） |
| 正面评价 | 9/10 | 对已有安全措施（JWT、RBAC、Prisma、Helmet 等）的认可客观公正 |

### 7.2 对各发现的逐一审核

#### C-1: LLM API 密钥泄露 — **确认，维持 CRITICAL**

审核意见：经验证 `apis/map/index.ts:49` 确认 `apiKey` 明文映射。这是最高优先级的安全问题。评审建议的脱敏方案可行，但应补充：脱敏应在 map 层统一处理，而非在 controller 中零散修改。

#### C-2: Zip Slip 路径遍历 — **确认，维持 CRITICAL**

审核意见：`skills.controller.ts:127` 的 `extractAllTo` 无路径校验，风险真实存在。评审建议的逐条验证方案正确，但建议使用 `zip.getEntries()` 先校验再 `extractAllTo`，而非解压后再校验。此外应补充 zip 条目大小校验防止 zip bomb。

#### C-3: todo.controller IDOR — **确认，降级为 HIGH**

审核意见：经验证，`getObjectOptions` 和 `getAssigneeCandidates` 确实缺少项目级权限校验。但这两个端点均受 `roleMiddleware('sysadmin', 'admin')` 保护，仅 sysadmin 和 admin 可访问。实际攻击场景受限（需要合法的 admin 凭据），因此建议降级为 HIGH。评审应区分「无认证」和「有认证但缺细粒度授权」。

#### H-1: 错误信息泄露 — **确认，维持 HIGH**

审核意见：`err.message` 直接返回前端的模式在多个控制器中普遍存在。应统一使用服务端日志记录 + 客户端固定错误消息的模式。

#### H-2: 桶文件导出缺失 — **驳回，与实际不符**

审核意见：经验证 `apis/app.ts`，所有路由注册使用的函数均直接从各控制器模块导入，不依赖 `controller/index.ts` 的 barrel 导出。此发现不构成安全问题，建议删除此项。

#### H-3: 角色值验证缺失 — **确认，维持 HIGH**

审核意见：Prisma enum 在数据库层提供最终防护，但应用层应在 controller 层做白名单校验，返回明确的 400 而非 500。评审建议的修复方案直接可用。

#### H-4: 密码强度验证缺失 — **确认，维持 HIGH**

审核意见：虽然 bcrypt cost=10 提供了存储安全，但弱密码仍易被在线暴力破解。建议添加最小长度（>=8）+ 复杂度要求。

#### H-5: URL 格式验证缺失 — **确认，维持 HIGH**

审核意见：base_url 缺少验证，SSRF 风险真实。评审建议的 `new URL()` 验证 + 协议/内网地址检查方案合理。

#### H-6: config_key 白名单缺失 — **确认，维持 HIGH**

审核意见：允许任意 config_key 的 upsert 确实存在配置篡改风险。应在 controller 层定义允许修改的 key 白名单。

#### M-1 ~ M-6 — **全部确认，维持 MEDIUM**

审核意见：各项 MEDIUM 发现均为合理的改进建议，优先级排序恰当。

### 7.3 评审意见修正汇总

| 编号 | 原评级 | 审核裁决 | 理由 |
|------|--------|---------|------|
| C-1 | CRITICAL | **维持 CRITICAL** | 明文密钥泄露，可被直接利用 |
| C-2 | CRITICAL | **维持 CRITICAL** | Zip Slip 可写任意文件 |
| C-3 | CRITICAL | **降级为 HIGH** | 端点受 roleMiddleware 保护，需合法凭据 |
| H-1 | HIGH | **维持 HIGH** | 信息泄露跨多个控制器 |
| H-2 | HIGH | **驳回** | 源码验证与实际不符，不构成问题 |
| H-3 | HIGH | **维持 HIGH** | 应用层白名单校验必要 |
| H-4 | HIGH | **维持 HIGH** | 弱密码是暴力破解的基础 |
| H-5 | HIGH | **维持 HIGH** | SSRF 风险真实 |
| H-6 | HIGH | **维持 HIGH** | 配置篡改风险 |
| M-1~M-6 | MEDIUM | **维持 MEDIUM** | 合理改进建议 |

### 7.4 最终裁决

**判定: 不通过（有条件通过）**

修正后有效问题统计：**2 个 CRITICAL + 6 个 HIGH + 6 个 MEDIUM**

#### 合并条件（必须修复后方可合并）：

1. **P0 立即修复（阻塞合并）**：
   - C-1: API 密钥脱敏 — 预估 0.5 天
   - C-2: Zip Slip 路径遍历修复 — 预估 0.5 天

2. **P1 短期修复（本迭代内）**：
   - H-1: 错误信息统一 — 预估 0.5 天
   - H-3: 角色值白名单 — 预估 0.5 天
   - H-4: 密码强度验证 — 预估 0.5 天
   - H-5: URL 格式验证 — 预估 0.5 天
   - H-6: config_key 白名单 — 预估 0.5 天
   - C-3（降级为 HIGH）: 项目权限校验 — 预估 1 天

3. **P2 中期改进（下一迭代）**：
   - M-1 ~ M-6: 账户锁定、分页上限、搜索限制等

#### 评审报告整体评价：

该安全评审报告质量较高，覆盖全面、分析深入、建议可操作。唯一不足是 H-2 项未经验证即列入，以及 C-3 的风险评级偏高（未考虑 roleMiddleware 保护）。建议评审者在后续评审中对路由级安全措施做更充分的调查。

**修正后综合安全评分: 6.0/10**（原评分 5.9 偏低，C-3 降级后微调）

---

*Committer 审核完成 — 2026-05-24*

---

## 八、安全修复记录

**修复日期**: 2026-05-24
**修复范围**: P0 + P1 全部问题（8项）

### 修复清单

| 编号 | 问题 | 修复文件 | 状态 |
|------|------|---------|------|
| C-1 | API密钥明文泄露 | `apis/map/index.ts` — `mapLlmModel` 脱敏为 `sk-t****-key` 格式 | ✅ 已修复 |
| C-2 | Zip Slip路径遍历 | `apis/controller/skills.controller.ts` — 解压前逐条校验路径 + zip bomb 检查 | ✅ 已修复 |
| C-3 | todo IDOR越权 | `apis/controller/todo.controller.ts` — `getObjectOptions`/`getAssigneeCandidates` 添加项目权限校验 | ✅ 已修复 |
| H-1 | 错误信息泄露 | `todo/user/llm-model/system-config` 四个 controller 统一使用固定错误消息 | ✅ 已修复 |
| H-3 | 角色值白名单 | `apis/controller/user.controller.ts` — `createUser` 添加 `['sysadmin','admin','view']` 校验 | ✅ 已修复 |
| H-4 | 密码强度验证 | `apis/controller/user.controller.ts` — `createUser` 要求密码 >= 8位 | ✅ 已修复 |
| H-5 | URL格式验证 | `apis/controller/llm-model.controller.ts` — `createLlmModel` 验证 URL 格式 + 协议白名单 | ✅ 已修复 |
| H-6 | config_key白名单 | `apis/controller/system-config.controller.ts` — 仅允许 `yishangshu_username`/`yishangshu_password` | ✅ 已修复 |

### 测试结果

- 799 个测试全部通过
- 构建通过（`pnpm build`）
- 同步更新了 6 个测试文件以适配安全修复

*安全修复完成 — 2026-05-24*

---

## 九、P2 中期改进修复记录

**修复日期**: 2026-05-26
**修复范围**: P2 全部 MEDIUM 问题（4项实际修复 + 2项已由 Zod schema 覆盖 + fullscreen 已由封装层覆盖）

### 修复清单

| 编号 | 问题 | 修复文件 | 状态 |
|------|------|---------|------|
| M-1 | 登录缺少账户锁定机制 | `apis/utils/account-lockout.util.ts`（新增）+ `apis/controller/auth.controller.ts` — 按用户名追踪失败次数，5次锁定15分钟 | ✅ 已修复 |
| M-2 | pageSize参数无上限 | 已通过 Zod schema `max(100)` 覆盖（`todo.schema.ts`、`user.schema.ts`、`skills.controller.ts` `Math.min(100,...)`） | ✅ 已有 |
| M-3 | search参数无长度限制 | 已通过 Zod schema `max(100/200)` 覆盖；`skills.controller.ts` 补充 `slice(0,100)` 硬限制 | ✅ 已修复 |
| M-4 | 解压失败未清理残留 | 已有 rollback 机制（`skills.controller.ts` catch 块 + `skills-file.service.ts` 回滚） | ✅ 已有 |
| M-5 | 反爬虫UA检查过于简单 | `apis/middleware/anti-crawl.middleware.ts` — 增加 curl/wget/python-requests/selenium 等 11 种自动化工具 UA 拦截 | ✅ 已修复 |
| M-6 | 登录错误信息区分度 | `apis/controller/auth.controller.ts` — `LoginSelectionError` 统一返回 401 + 固定消息，防止用户名枚举 | ✅ 已修复 |

### fullscreen.tsx 封装层修复状态

fullscreen.tsx 所有 Committer 裁决条件已在 `pages/components/MarkdownEditor.tsx` 封装层 `commandsFilter` 中完整覆盖：

| 条件 | 修复位置 | 状态 |
|------|---------|------|
| P0: 移除 shortcuts 条件守卫 | `MarkdownEditor.tsx:574-579` execute 重写 | ✅ 已修复 |
| P1: 快捷键重映射为 ctrlcmd+shift+f | `MarkdownEditor.tsx:568` | ✅ 已修复 |
| P2: 中文 ARIA + antd 图标 | `MarkdownEditor.tsx:569-573` FullscreenOutlined | ✅ 已修复 |

### 测试结果

- auth.controller: 201 测试通过（含 M-1 账户锁定 + M-6 统一错误）
- anti-crawl.middleware: 54 测试通过（含新增 bot UA 拦截）
- company.controller: 185 测试通过
- llm-model: 676 测试通过
- TypeScript 编译通过（`tsc --noEmit`）
- ESLint 通过

*P2 中期改进修复完成 — 2026-05-26*

---

## fullscreen.tsx — Committer 审核专家评审

**评审日期**: 2026-05-25
**评审角色**: Committer 审核专家（代码合并准入 · 依赖可接受性 · 项目集成风险 · 规范兼容性 · 生产就绪度）
**文件路径**: `@uiw/react-md-editor@4.1.0/src/commands/fullscreen.tsx`
**代码行数**: 31 行（1 个导出 `ICommand` 对象）
**前序评审**: 安全评审 8.5/10 APPROVE、UI 评审 3.4/10 CONDITIONAL APPROVE
**评审结论**: ⚠️ CONDITIONAL APPROVE — execute 函数按钮点击不触发全屏（CRITICAL），需封装层自定义命令覆盖
**综合评分**: 5.5 / 10

### 发现汇总

| 级别 | 数量 | 关键发现 |
|------|------|---------|
| CRITICAL | 1 | execute 函数 `shortcuts` 条件守卫导致按钮点击不触发全屏切换（U1） |
| HIGH | 3 | 缺少 `aria-pressed` 无障碍状态（U2）/ 快捷键 `ctrlcmd+0` 与浏览器冲突（U3）/ 图标 12×12 不符合 Carbon 规范（U4） |
| MEDIUM | 3 | ARIA 标注英文+空格不一致（U5）/ 全屏状态图标无变化（U6）/ `focus()` 无条件执行位置不当（U7） |
| LOW | 2 | dispatch 可能覆盖 ContextStore（U8）/ SVG path 过度复杂（U9） |

### Committer 裁决条件

1. **必须（P0）**: 封装层自定义 fullscreen 命令覆盖 execute，移除 `shortcuts` 条件守卫
2. **必须（P1）**: 重新绑定快捷键为 `ctrlcmd+shift+f`
3. **建议（P2）**: 中文 ARIA 标注 + antd 图标替换

*Committer 审核完成 — 2026-05-25*

---

## pages/user/index.tsx — Committer 审核专家评审

**评审日期**: 2026-05-26
**评审角色**: Committer 审核专家（代码合并准入 · 依赖可接受性 · 项目集成风险 · 规范兼容性 · 生产就绪度）
**文件路径**: `pages/user/index.tsx` (228行) + `pages/user/UserForm.tsx` (101行)
**前序评审**: 安全评审 5.8/10、架构评审 4.5/10、质量评审 6.4/10、UI 评审 4.0/10
**评审结论**: **REQUEST CHANGES** — 阻断合并，3项 BLOCKING 问题必须修复
**综合评分**: 4.9 / 10

### 发现汇总

| 级别 | 数量 | 关键发现 |
|------|------|---------|
| BLOCKING | 3 | 原生table违反铁律(B-1) / 空catch吞错误(B-2) / 搜索无防抖DoS(B-3) |
| HIGH | 5 | 状态切换无确认(H-1) / Switch无loading(H-2) / 双视图同渲染(H-3) / 认证双数据源(H-4) / 类型重复定义(H-5) |
| MEDIUM | 9 | 无AbortController / 无Tooltip / 无Skeleton / 分页不完整 / any类型 / 魔术字符串 / 颜色硬编码 / 空状态无引导 / useState扁平罗列 |
| LOW | ~8 | 各报告L级问题合计 |

### Committer 裁决条件

1. **必须（P0）**: 替换原生table为antd Table（消除铁律违规 + 附带解决H-3/M-4/L-3）
2. **必须（P0）**: 空 catch 添加 `console.error` + `message.error()` 错误提示
3. **必须（P0）**: 搜索输入添加 300ms debounce
4. **建议（P1）**: Popconfirm确认 + useAuth替换 + 共享类型文件
5. **建议（P2）**: M-1 ~ M-9 中等优化

*Committer 审核完成 — 2026-05-26*
