## 本次变更（2026-05-24 apis/app.ts 软件质量专家评审）
- [x] 软件质量专家评审 apis/app.ts（239 行）
- [x] 综合评分 B（结构基本合理，存在可维护性和扩展性瓶颈）
- [x] 10 项质量发现：HIGH×3（96条路由平铺、中间件重复90+次、注释与代码不匹配）、MEDIUM×5（无API版本化、无请求验证层、无请求日志、错误不分类、路由分组不一致）、LOW×2（Swagger无条件生成、角色字符串硬编码）
- [x] 正面评价：安全基础9/10、中间件链顺序正确、配置层设计精良
- [x] 提出目标架构：路由拆分为 Router 模块，app.ts 缩减至 <60 行
- [x] 评审报告 tasks/review/app.quality.md


## 本次变更（2026-05-24 apis/app.ts 代码安全专家评审）
- [x] **代码安全专家评审 apis/app.ts（第二轮）**
  - 综合安全评级 B（第一轮 C → 修复后 B+ → 本轮重新评估 B）
  - 验证第一轮 12 项修复：10/12 已修复（83%），2 项为架构决策延后
  - 新发现 10 项安全问题：HIGH×1（上传文件公开访问，延续项）、MEDIUM×5（CORS !origin 绕过、CORS 错误处理、Swagger Spec 无条件生成、错误日志缺少上下文、缺少安全审计日志）、LOW×4
  - 新引入安全域评价：可观测性（3/10）、弹性（5/10）
  - 修复优先级：P0×3（安全审计能力）、P1×3（攻击面缩减）、P2×3（安全加固）
  - 评审报告 tasks/review/app.ts.md（同名新文件，不覆盖第一轮 app.md）
  - 127 个 app 测试全部通过


## 本次变更（2026-05-24 apis/app.ts TDD 测试补全）
- [x] **apis/app.ts 测试用例补全** — 从 127 个增加到 156 个测试用例
  - 新增 Auth Companies Detail 路由 401 测试（1个）
  - 新增 CORS Preflight OPTIONS 预检请求测试（4个）
  - 新增 Token 格式边界测试：空Bearer、无前缀、Basic auth、错误签名、部分payload（5个）
  - 新增正向角色检查测试：admin/sysadmin 通过角色检查（8个）
  - 新增速率限制 headers 和请求测试（2个）
  - 新增 Login 路由边界测试：空值、空body、有效凭证（3个）
  - 新增 404 HTTP 方法测试（4个）
  - 新增静态文件边界和 Swagger 启用场景测试（2个）
  - 覆盖率：Stmts 98%, Branch 71.42%, Funcs 83.33%, Lines 98.65%
  - 发现：authMiddleware 仅验证 JWT 签名，不校验 payload 字段完整性
  - 发现：health check 路由在 rate limit 中间件之前，不受速率限制


## 本次变更（2026-05-24 apis/app.ts Committer审核专家评审）
- [x] **Committer审核专家评审 apis/app.ts（239 行）**
  - 综合判定：通过（APPROVE）— 安全基础优秀 + 测试覆盖充分 + 功能完整
  - 测试文件：1319 行，156 个测试用例全部通过（比预估 120 个更充分）
  - API 契约正确性：96/96 路由与 Controller 导出函数 100% 匹配
  - 中间件链正确性：trust proxy → helmet → CORS → body → static → anti-crawl → rate-limit → auth → RBAC，全部到位
  - 交叉审核五份已有评审（质量/安全×2/架构），所有问题均不构成合并阻塞
  - 建议合并前修正 L187 注释错误（Knowledge Item → Todo），其余为技术债务
  - 评审报告 tasks/review/app.ts.committer.md


## 本次变更（2026-05-24 apis/app.ts 评审问题修复）
- [x] **修复 4 项评审问题**（安全第二轮 SEC-2.04/SEC-2.05/SEC-2.06 + 质量 Q-03）
  - Q-03: L187 注释错误 "Knowledge Item" → "Todo"（H-1）
  - Q-06/SEC-2.04: Swagger Spec 条件化生成，`swaggerJSDoc()` 移入 `if` 块内，避免生产环境无谓 I/O
  - SEC-2.05: 错误日志增加请求上下文（method/url/ip/userId/role）
  - SEC-2.06: 新增请求级安全审计日志中间件（4xx/5xx 日志）
  - TypeScript 编译通过、156 个测试全部通过


## 本次变更（2026-05-24 apis/app.ts TDD 测试第三次补全）
- [x] **apis/app.ts 测试用例第三次补全** — 从 156 个增加到 184 个测试用例（+28）
  - 新增审计日志中间件测试 10 个：console.warn 4xx/5xx 记录、200 不记录、userId/anonymous 区分、timing/method/URL/IP 格式验证
  - 新增 Login Body 类型验证测试 4 个：非字符串用户名/密码、超长用户名/密码
  - 新增 Auth Verify 正向测试 2 个：sysadmin/admin token 返回 200 + valid:true
  - 新增 CORS 边界测试 2 个：无 origin 请求通过、Content-Type 头验证
  - 新增全局错误处理器深度测试 2 个：结构化日志、统一 500 响应格式
  - 新增健康检查隔离测试 3 个：无 UA/无认证/响应时间 <100ms
  - 新增 Auth 路由方法覆盖 3 个：admin pass auth、selection/companies 401
  - 新增中间件执行顺序测试 2 个：health check 绕过 anti-crawl、login 经 anti-crawl 拦截
  - 覆盖率：Stmts 88.73%, Branch 61.53%, Funcs 87.5%, Lines 90%
  - TDD 报告：tasks/tdd/app.test.md（第三次更新）


## 本次变更（2026-05-24 apis/app.ts 软件质量专家第三轮复审）
- [x] **软件质量专家评审 apis/app.ts（259 行，修复后复审）**
  - 综合评级 B+（从 B 提升，修复质量扎实，可维护性瓶颈依旧）
  - 验证五项修复落地质量：Q-03注释修正✅、Q-06/SEC-2.04 Swagger条件化✅、SEC-2.05错误上下文✅、SEC-2.06审计日志✅
  - 剩余质量问题 7 项：HIGH×1（96条路由平铺）、MEDIUM×3（中间件重复90+、无API版本化、无请求验证层）、LOW×3（角色硬编码、路由分组不一致、日志格式不统一）
  - 新发现 RQ-07：审计日志（空格分隔）与错误日志（JSON.stringify）格式不一致
  - 修复优先级：P0×2（路由拆分+Router级中间件）、P1×3（zod验证+API版本化+日志格式统一）、P2×2（角色常量化+路由分组）
  - 评审报告 tasks/review/app.ts.md


## 本次变更（2026-05-24 apis/app.ts 软件架构专家重构后复审）
- [x] **软件架构专家评审 apis/app.ts（148 行，路由模块化后复审）**
  - 综合评级 B+（从第一轮 B- 提升，核心架构瓶颈已消除）
  - 验证第一轮 CRITICAL×2 + HIGH×3 修复情况：C-1 路由模块化✅、C-2 中间件重复消除✅、H-1 注释修正✅、M-1 Swagger条件化✅、M-3 错误分类处理✅、SEC-2.05 错误上下文✅、SEC-2.06 审计日志✅
  - 剩余架构问题 7 项：P2×4（无API版本化、CORS拒绝无日志、静态文件绕过安全中间件、Swagger require类型安全）、P3×4（路由挂载前缀不一致、日志格式不统一、畸形JSON无处理、请求体大小硬编码）
  - 文件从 239 行减至 148 行（-38%），Controller 导入从 16 个降为 0 个
  - SOLID 评估改善：SRP ❌→✅、OCP ❌→⚠️、ISP ⚠️→✅
  - 评审报告 tasks/review/app.ts.architecture.md


## 本次变更（2026-05-24 apis/app.ts 代码安全专家重构后复审）
- [x] **代码安全专家评审 apis/app.ts（148 行，路由模块化后安全复审）**
  - 综合安全评级 A-（从原始 C 级提升，历史 6 项 CRITICAL/HIGH/MEDIUM 漏洞全部修复）
  - 验证历史漏洞修复：SEC-01 CORS 开放✅、SEC-02 JWT 硬编码✅、SEC-03 缺安全头✅、SEC-04 无错误处理✅、SEC-05 无请求体限制✅、SEC-06 Swagger 暴露✅
  - 新发现 8 项安全事项：MEDIUM×3（CORS !origin 允许无 Origin 请求、Health Check 绕过安全中间件、静态文件路径依赖 process.cwd()）、LOW×5（JSON 10MB 偏高、trust proxy 固定值、缺 CSP、无请求超时、日志格式不一致）
  - 防御层完整性评估：CSRF/XSS/SQL注入/暴力破解/DDoS/CORS滥用/信息泄露/请求体DoS/路径遍历/JWT伪造 全部有对应防御
  - 安全改进路线图：P0×2（静态文件路径+请求超时）、P1×4（JSON body 限制+Health 限流+trust proxy 配置化+日志格式统一）、P2×1（Swagger CSP）
  - 评审报告 tasks/review/app.ts.security.md


## 本次变更（2026-05-24 apis/app.ts Committer审核专家重构后复审）
- [x] **Committer审核专家复审 apis/app.ts（147 行，路由模块化重构后复审）**
  - 综合判定：通过（APPROVE）— Composition Root 回归本职，安全基线 A-，测试覆盖充分
  - 重构验证：文件从 239 行减至 147 行（-38%），Controller 导入从 16 个降为 0 个，13 个 Router 模块
  - 抽查 3 个路由模块（auth/article/todo）验证中间件链与路由路径与重构前等价
  - 测试完备性：184 个用例，行覆盖率 90%，含审计日志深度测试 10 个用例
  - 历史问题解决情况：HIGH×3 全部解决（路由平铺、中间件重复、注释错误），CRITICAL×6 安全漏洞全部修复
  - 交叉审核六份已有评审（质量 B/B+、安全 C→A-、架构 B-→B+），所有阻塞项已通过重构解决
  - 剩余 9 项 P2-P3 建议（API 版本化、CORS 日志、静态文件路径、日志格式统一等）不阻塞合并
  - 评审报告 tasks/review/app.ts.committer.md


## 本次变更（2026-05-24 apis/app.ts 评审修复第二轮）
- [x] **fix: apis/app.ts 评审修复（5 项）** — 183 个测试通过
  - FIX-R2-01: CORS 拒绝请求添加日志（console.warn('[CORS] Rejected origin:', origin)）
  - FIX-R2-02: 畸形 JSON 返回 400 而非 500（全局错误处理识别 SyntaxError）
  - FIX-R2-03: 审计日志格式统一为 JSON（JSON.stringify 结构化格式，与错误日志一致）
  - FIX-R2-04: 静态文件路径配置化（process.cwd() → config.uploadDir，支持 UPLOAD_DIR 环境变量）
  - FIX-R2-05: validate 中间件支持 query/params 验证（validate(schema, source) 支持 body/query/params）
  - 测试同步更新：审计日志测试改为 JSON 解析、畸形 JSON 测试改为期望 400、登录验证消息更新
  - 配置新增 uploadDir 字段（AppConfig.uploadDir，默认 path.resolve(process.cwd(), 'uploads')）

