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
