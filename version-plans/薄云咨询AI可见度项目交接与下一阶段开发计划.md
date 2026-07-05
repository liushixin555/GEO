# 薄云咨询 AI 可见度项目交接与下一阶段开发计划

## 1. 文档目的

这份文档用于帮助后续开发人员、项目负责人和使用 Codex 协作的同事快速理解当前项目状态，并继续推进下一阶段开发。

下一阶段的核心目标不是盲目增加功能，而是把“文章生成 -> 发布 -> AI 引用检测 -> 台账追踪 -> 反哺内容与证据”的闭环做稳。尤其要优先完成检测台账和自动检测能力，让薄云咨询发布出去的文章是否被 AI 回答引用，能够被系统持续追踪。

本文档包含：

- 当前项目已经完成什么
- 当前系统还缺什么
- 下一阶段应该优先做什么
- 每个任务怎么做
- 可能遇到哪些问题
- 如何验收
- 可以直接复制给 Codex 新会话的启动提示词

## 2. 项目当前情况

项目目标是提升薄云咨询在 AI 回答中的可见度、推荐概率和引用命中率。当前系统已经形成三条主要链路。

### 2.1 文章生成链路

当前系统已经支持基于以下材料生成文章：

- 文章标题
- 关键词
- 受众画像
- 已选择图片
- 写作 skill
- EvidenceCard 证据卡片

文章生成服务已经接入 EvidenceCard。生成文章前，后端会根据文章标题、关键词、项目和公司信息检索 3-8 条 verified 状态的证据卡片，并注入 prompt。

文章生成 debug 中已经可以记录：

- 实际检索到的证据
- 实际注入 prompt 的证据内容
- 证据检索 query
- 证据 warning
- evidenceStats
- evidencePromptPreview

### 2.2 知识库证据化链路

EvidenceCard 已经完成第一阶段闭环：

- EvidenceCard CRUD
- 手动创建证据卡片
- 从文本、画像、图片描述中抽取候选证据
- status：draft / verified / deprecated
- sourceQuality
- articleTypes
- verifiedAt / verifiedBy
- 文章生成前 retrieval
- prompt 注入
- ArticleEvidenceCard injected 关系记录
- evidenceSnapshot
- 文章详情展示实际注入证据

当前本地已经做过一轮自测：

- 从薄云咨询现有材料中整理过证据原始材料
- 自动抽取并自审核过一批 EvidenceCard
- 使用 verified 证据生成过测试文章
- 发现并记录过文章生成调度器状态异常

### 2.3 发布与引用检测链路

发布管理已经具备基础能力：

- 发布计划
- 发布平台
- 软盟订单创建
- 软盟订单同步
- 发布链接提取
- 发布链接写入 `published_article_links`

引用诊断模块已经有雏形，相关模型包括：

- `PublishedArticleLink`：保存我方已发布文章链接
- `AiCitationDetectionRun`：保存一次 AI 检测任务
- `AiCitationRecord`：保存 AI 回答里抓到的引用来源
- `ArticleModelCitationMark`：保存文章被某个模型引用过的永久标签

已有接口包括：

- `GET /api/v1/citation-diagnosis/ledger`
- `POST /api/v1/citation-diagnosis/run-auto`
- `GET /api/v1/citation-diagnosis/runs`
- `GET /api/v1/citation-diagnosis/marks`
- `GET /api/v1/citation-diagnosis/links`
- `POST /api/v1/citation-diagnosis/links`

已有前端页面：

- `/citation-diagnosis`

这个页面目前定位为检测管理后台，用来查看发布文章台账和引用检测结果。

## 3. 当前主要不足

### 3.1 引用诊断模块存在中文乱码

引用诊断相关代码中，有一部分中文文案已经变成乱码。影响范围包括：

- 后端错误信息
- 检测 prompt
- 默认检测问题
- 前端页面列名
- 前端按钮
- 前端提示语
- CSV 导出文件名和表头

这会影响开发、验收和实际检测质量，必须作为下一阶段第一项工作处理。

### 3.2 检测台账还不够可解释

当前台账主要能表达“某篇文章是否命中过某个模型”，但还不够让业务人员看懂。

下一阶段需要补齐：

- 本次检测问了什么问题
- AI 回答了什么
- AI 回答引用了哪些来源
- 哪个来源命中了我方发布链接
- 命中的引用片段是什么
- 是否只是同域出现，还是精确 URL 命中
- 检测失败时失败原因是什么

### 3.3 自动检测还没有闭环

当前已有手动复检能力，但文章发布成功后，还不能自动检测。

理想状态是：

1. 文章发布成功。
2. 系统拿到发布 URL。
3. URL 写入 `published_article_links`。
4. 后台自动检测该链接是否出现在 AI 回答引用来源中。
5. 检测结果写入台账。
6. 命中过的模型标签永久保留。

### 3.4 文章生成 prompt 需要按 skill 拆分

当前文章生成 prompt 主要集中在 `apis/service/impl/llm.service.impl.ts`。

问题是：

- 文件越来越大
- 通用规则、品牌规则、图片规则、证据规则、排名规则混在一起
- 后续新增不同文章类型或不同 skill 时容易互相影响
- debug 虽然记录 prompt，但维护成本高

下一阶段建议新增 prompt builder，让不同 skill 有独立提示词策略。

### 3.5 EvidenceCard 还需要稳定，但不建议扩大范围

EvidenceCard 是内容质量的地基。下一阶段应该继续维护，但不建议马上扩展到复杂能力。

近期只建议做：

- 修复文章生成成功却被标记失败的问题
- 增加风险词 warning
- 继续检查证据注入质量
- 保持 verified EvidenceCard 检索稳定

暂不做：

- 联网搜索写文章
- 向量数据库
- ContentMission
- EntityGraph
- 多 Agent Planner
- 平台贡献评分
- 竞品来源反推

## 4. 全局开发规则

所有后续会话必须遵守：

- 不修改 `.agents/`
- 不运行 seed
- 不运行 `pnpm test`
- 不推送代码，除非负责人明确要求
- 前端必须使用 Ant Design
- 前端时间显示必须使用 `pages/utils/date.ts`
- `view` 角色不能访问检测、证据、发布、系统管理功能
- 不引入联网搜索写文章、向量库、ContentMission、EntityGraph
- 不把前端预览结果当成正式生成依据
- 不把没有 URL 的标题匹配算作引用命中
- 不诱导 AI 强行引用我方链接
- 检测失败不能阻塞发布流程
- 文章被某模型引用过一次后，该模型标签长期保留

验证优先使用：

```bash
npm.cmd run lint
npx.cmd tsc -p tsconfig.api.json --noEmit
```

如果需要完整构建：

```bash
npm.cmd run build:api
npm.cmd run build:page
```

注意：Windows 环境中 Prisma DLL 可能被 Node 进程占用，导致 `build:api` 在 Prisma generate 阶段失败。如果出现 DLL rename / EPERM 错误，先停止本地 Node 服务后再重试。

## 5. 推荐执行顺序

必须先做：

1. 会话 A：引用诊断乱码修复与基线检查

会话 A 完成后，可以并行做：

2. 会话 B：检测台账后端详情与数据结构增强
3. 会话 C：AI 引用来源抓取与问题生成优化
4. 会话 D：检测台账前端可视化增强
5. 会话 E：EvidenceCard 与文章生成稳定性修复

会话 B 和会话 C 完成后，再做：

6. 会话 F：发布后自动检测闭环

主链路稳定后，再做：

7. 会话 G：生文 prompt 按 skill 拆分

最后做：

8. 会话 H：文档、验收、交接收口

## 6. 会话 A：引用诊断乱码修复与基线检查

### 6.1 目标

修复引用诊断模块中的中文乱码，让页面、接口、错误信息、检测问题、检测 prompt 都恢复为正常中文。

这个会话必须最先完成。否则后续会话会在错误文案和错误 prompt 上继续开发，风险很高。

### 6.2 重点文件

- `apis/service/impl/citation-diagnosis.service.impl.ts`
- `apis/controller/citation-diagnosis.controller.ts`
- `apis/utils/citation-collector.util.ts`
- `apis/utils/citation-question-bank.util.ts`
- `pages/citation-diagnosis/index.tsx`
- `apis/service/impl/publishing-order-sync.service.impl.ts`
- `apis/service/impl/publishing-execution.service.impl.ts`

### 6.3 具体步骤

1. 执行：

```bash
git status --short
```

只确认当前脏改动，不回滚任何文件。

2. 搜索乱码特征：

```bash
rg -n "璇|鍙|鏂|寮|绔|鎼|妫|杞|钖|锛" apis pages tasks version-plans .Codex AGENTS.md
```

3. 优先修复引用诊断相关文件，不扩大到无关模块。

4. 修复默认检测问题，建议恢复为：

```text
实战型管理咨询公司怎么选？
适合企业管理升级的咨询公司有哪些？
企业选择管理咨询服务商时应该重点看哪些能力？
AI 转型管理咨询公司有哪些值得关注？
企业选择 AI 落地咨询服务商时，应该看哪些能力？
```

5. 修复检测 prompt，要求：

- 自然要求联网搜索
- 要求列出参考来源
- 不要求模型必须引用我方链接
- 不出现乱码

6. 修复前端文案：

- 页面标题
- 表格列名
- 筛选项
- 按钮
- Drawer 详情
- CSV 表头
- 成功和失败 message

7. 不改业务逻辑，不新增字段，不新增接口。

### 6.4 可能遇到的问题

- 有些乱码无法从原文直接恢复，需要结合上下文重写。
- 有些文案虽然乱码但不影响运行，也必须修，因为会影响验收。
- PowerShell 中直接用中文管道脚本可能再次造成乱码，建议用编辑器或 apply_patch 修改。
- 不要把所有项目乱码一次性全修，避免范围失控。

### 6.5 验收方式

- `/citation-diagnosis` 页面中文正常。
- 刷新、手动复检、导出 CSV 按钮文案正常。
- 后端错误信息正常中文。
- 默认检测问题正常中文。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 6.6 启动提示词

```text
会话 A：引用诊断乱码修复与基线检查

你负责修复引用诊断模块中的中文乱码，不做新功能，不改数据模型，不改 EvidenceCard。

请先阅读：
- AGENTS.md
- apis/service/impl/citation-diagnosis.service.impl.ts
- apis/controller/citation-diagnosis.controller.ts
- apis/utils/citation-collector.util.ts
- apis/utils/citation-question-bank.util.ts
- pages/citation-diagnosis/index.tsx
- apis/service/impl/publishing-order-sync.service.impl.ts

目标：
让引用诊断后台、接口提示、检测问题、AI 检测 prompt 全部恢复为正常中文。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 不改变业务逻辑
- 不回滚已有用户改动

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- 修复了哪些文件
- 哪些乱码无法确认
- 是否影响业务逻辑
- 验证结果
```

## 7. 会话 B：检测台账后端详情与数据结构增强

### 7.1 目标

让后端能保存并返回更完整的引用检测详情，包括 AI 回答片段、引用片段、来源序号、原始来源对象。

### 7.2 重点文件

- `prisma/schema.prisma`
- `apis/schema/citation-diagnosis.schema.ts`
- `apis/service/citation-diagnosis.service.ts`
- `apis/service/impl/citation-diagnosis.service.impl.ts`
- `apis/controller/citation-diagnosis.controller.ts`
- `apis/routes/citation-diagnosis.routes.ts`
- `tasks/db.数据模型变更汇总.md`

### 7.3 建议新增字段

在 `AiCitationRecord` 增加：

- `answerSnippet String?`
- `citationSnippet String?`
- `sourceIndex Int?`
- `rawSource Json?`

字段含义：

- `answerSnippet`：AI 回答中与该来源相关的简短片段
- `citationSnippet`：命中引用附近的片段
- `sourceIndex`：来源在本次 AI 返回来源列表中的序号
- `rawSource`：原始来源对象，用于排查不同模型返回格式差异

### 7.4 建议新增接口

新增：

```http
GET /api/v1/citation-diagnosis/ledger/:articleId/details
```

返回建议：

```json
{
  "article": {
    "id": 1,
    "title": "文章标题",
    "keywords": "关键词"
  },
  "publishedLinks": [
    {
      "id": 1,
      "url": "https://example.com/a",
      "normalizedUrl": "example.com/a",
      "platformName": "发布平台"
    }
  ],
  "marks": [
    {
      "modelName": "DeepSeek",
      "firstMatchedAt": "2026-07-01T00:00:00.000Z",
      "lastMatchedAt": "2026-07-01T00:00:00.000Z",
      "matchCount": 2
    }
  ],
  "runs": [
    {
      "id": 1,
      "modelName": "DeepSeek",
      "prompt": "检测问题",
      "answer": "AI 回答",
      "status": "completed",
      "createdAt": "2026-07-01T00:00:00.000Z",
      "records": [
        {
          "sourceUrl": "https://example.com/a",
          "sourceTitle": "来源标题",
          "matched": true,
          "citationSnippet": "引用片段",
          "answerSnippet": "回答片段"
        }
      ]
    }
  ]
}
```

### 7.5 具体步骤

1. 确认现有 Prisma schema。
2. 修改 `AiCitationRecord` 模型。
3. 创建 migration，不使用 seed。
4. 扩展 service 接口定义。
5. 修改 `saveDetectionRun`，保存 `answerSnippet`、`citationSnippet`、`sourceIndex`、`rawSource`。
6. 新增 `getLedgerDetail(articleId, params, auth)`。
7. 新增 controller 方法。
8. 新增 route。
9. 权限沿用 sysadmin/admin，admin 只能看自己可访问项目文章。
10. 更新 `tasks/db.数据模型变更汇总.md`。

### 7.6 可能遇到的问题

- Prisma Client 未生成会导致类型报错。
- raw SQL 字段名要和 snake_case 对齐。
- `answerSnippet` 和 `citationSnippet` 不要无限长，建议最多 1000 字。
- `rawSource` 里可能包含复杂对象，要确保可 JSON 序列化。
- 详情接口不能泄漏无权限项目文章。

### 7.7 验收方式

- `npx prisma validate` 通过。
- 手动创建 detection run 后，record 能保存增强字段。
- 详情接口返回文章、发布链接、mark、run、record。
- 无权限返回 403。
- 不存在文章返回 404。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 7.8 启动提示词

```text
会话 B：检测台账后端详情与数据结构增强

你负责引用诊断台账的后端详情能力和必要数据模型增强，不做前端页面。

请先阅读：
- AGENTS.md
- prisma/schema.prisma
- apis/service/impl/citation-diagnosis.service.impl.ts
- apis/service/citation-diagnosis.service.ts
- apis/controller/citation-diagnosis.controller.ts
- apis/routes/citation-diagnosis.routes.ts
- tasks/db.数据模型变更汇总.md

目标：
让台账能追溯每篇文章的发布链接、检测 run、AI 回答、引用来源、是否命中、引用片段。

建议实现：
1. AiCitationRecord 增加 answerSnippet / citationSnippet / sourceIndex / rawSource。
2. 新增 GET /api/v1/citation-diagnosis/ledger/:articleId/details。
3. saveDetectionRun 写入更完整的 record 信息。
4. 权限保持 sysadmin/admin。
5. 更新数据库变更文档。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 不改前端
- 不影响已有 /ledger /runs /marks 接口

验收：
- npx prisma validate
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- migration 名称
- 新增接口返回结构
- 修改文件列表
- 验证结果
- 兼容性风险
```

## 8. 会话 C：AI 引用来源抓取与问题生成优化

### 8.1 目标

提升检测有效性，让检测问题更自然，让不同 AI 平台返回的引用来源更容易被解析。

### 8.2 重点文件

- `apis/utils/citation-collector.util.ts`
- `apis/utils/citation-question-bank.util.ts`
- `apis/utils/citation-url.util.ts`
- `apis/service/impl/citation-diagnosis.service.impl.ts`

### 8.3 具体方向

1. 平台名称修复：

- `DeepSeek`
- `豆包`
- `元宝`
- `千问`
- `Kimi`

2. 检测问题模板优化：

```text
AI 转型管理咨询公司有哪些值得关注？请结合公开资料回答，并列出参考来源。
企业选择 AI 落地咨询服务商时，应该重点看哪些能力？请基于联网搜索回答。
请联网搜索“{文章标题}”相关观点，并说明参考了哪些网页来源。
围绕“{关键词}”，有哪些服务商、方法或案例值得参考？请列出来源。
```

3. 来源解析增强，兼容：

- URL 字符串
- OpenAI Responses 风格的 citation
- DashScope / 千问搜索结果
- 豆包 web_search references
- 回答末尾 URL 列表

4. URL 标准化继续保留：

- 去掉 `utm_*`
- 去掉 `spm`
- 去掉 `from`
- 去掉 `source`
- 去掉 hash
- 移动端 `m.` 归一到 `www.`

5. snippet 生成：

如果来源 URL 命中我方链接，则在 answer 中截取 URL 前后或来源标题附近约 300 字作为 snippet。

### 8.4 可能遇到的问题

- 有些模型没有联网搜索能力，只能返回 skipped。
- 有些模型 API Key 缺失，不能当系统失败。
- 有些模型只给标题不给 URL，不能算命中。
- 有些模型引用域名首页，不引用具体文章 URL，本阶段先不做同域弱匹配。
- 外部 API 不稳定，失败要落库或返回 error，不要中断整批。

### 8.5 验收方式

- 无配置模型返回 skipped。
- API 报错返回 error。
- sources 能保留 URL、标题、snippet、raw。
- 检测问题没有乱码。
- 不强制诱导模型引用我方链接。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 8.6 启动提示词

```text
会话 C：AI 引用来源抓取与问题生成优化

你负责优化引用检测的问题生成和来源解析，不做前端，不做自动调度。

请先阅读：
- AGENTS.md
- apis/utils/citation-collector.util.ts
- apis/utils/citation-question-bank.util.ts
- apis/utils/citation-url.util.ts
- apis/service/impl/citation-diagnosis.service.impl.ts

目标：
让 run-auto 调用 AI 检测时，问题更自然、来源解析更稳定、失败更可解释。

必须实现：
1. 修复平台中文名称。
2. 优化默认问题模板。
3. 增强 extractSources，兼容不同模型返回结构。
4. 返回 source 的 raw/snippet/index 信息，供会话 B 存库。
5. 无 API Key 返回 skipped，不阻塞整批检测。
6. API 报错返回 error，不中断其他模型。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 不强迫 AI 引用我方链接
- 不把没有 URL 的标题匹配算作命中

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- 支持了哪些来源结构
- 检测问题模板
- skipped/error 行为
- 验证结果
```

## 9. 会话 D：检测台账前端可视化增强

### 9.1 目标

让非技术人员能通过页面看懂检测结果，而不是只看到一行“被引用”。

### 9.2 依赖

建议等会话 A 完成后开始。

如果会话 B 的详情接口还没完成，可以先用空状态预留详情区域，但不能让列表功能报错。

### 9.3 重点文件

- `pages/citation-diagnosis/index.tsx`
- `pages/lib/apiClient.ts`
- `pages/utils/date.ts`

### 9.4 页面要求

列表展示：

- 发布时间
- 发布平台
- 文章标题
- 关键词
- 发布链接
- 引用状态
- 引用模型
- 命中次数
- 最近检测时间
- 操作：详情、手动复检

详情 Drawer 展示：

- 文章信息
- 发布链接列表
- 永久引用标签
- 检测 run 列表
- 每次 run 的模型
- 检测问题
- 检测时间
- 状态
- AI 回答摘要
- 引用来源列表
- 命中来源高亮

### 9.5 交互要求

- 命中我方链接用绿色 Tag。
- 未命中用默认 Tag。
- 检测失败用红色 Tag，并展示失败原因。
- 长 URL 使用 `Typography.Link` + ellipsis。
- 不新增页面级 y 轴滚动条风险。
- 使用 Ant Design 的 Table、Drawer、Descriptions、Tag、Collapse、Typography、Button、Space。

### 9.6 可能遇到的问题

- 当前页面已有乱码，必须先依赖会话 A。
- 如果详情接口未完成，前端必须展示“暂无检测详情”，不能报错。
- Table 不要使用固定 y 滚动。
- CSV 导出要保持可用。
- 不要把检测页面开放给 view 角色。

### 9.7 验收方式

- 页面中文正常。
- 列表加载成功。
- 点击详情能看到检测记录。
- 无检测记录时展示空状态。
- 命中来源高亮。
- 手动复检后能刷新台账。
- CSV 导出仍可用。
- `npm.cmd run lint` 通过。
- `npm.cmd run build:page` 通过。

### 9.8 启动提示词

```text
会话 D：检测台账前端可视化增强

你负责 /citation-diagnosis 页面体验，不做后端业务逻辑。

请先阅读：
- AGENTS.md
- DESIGN.md
- pages/citation-diagnosis/index.tsx
- pages/router/routes.tsx
- pages/lib/apiClient.ts
- pages/utils/date.ts

目标：
让非技术人员能看懂 AI 引用检测台账：发布链接、引用模型、命中次数、检测问题、AI 回答、引用来源、命中片段。

必须遵守：
- 前端使用 Ant Design
- 遵守 DESIGN.md
- 时间用 pages/utils/date.ts
- 不制造页面 y 轴滚动条
- 不修改 .agents/
- 不运行 pnpm test
- 不推送

接口约定：
- GET /api/v1/citation-diagnosis/ledger
- GET /api/v1/citation-diagnosis/ledger/:articleId/details
- POST /api/v1/citation-diagnosis/run-auto

如果详情接口暂未可用：
- 页面保留详情区域
- 展示“暂无检测详情”
- 不阻塞列表功能

验收：
- npm.cmd run lint
- npm.cmd run build:page

完成后返回：
- 页面新增展示项
- 调用接口
- 空状态和失败状态
- 验证结果
```

## 10. 会话 E：EvidenceCard 与文章生成稳定性修复

### 10.1 目标

继续稳定证据生成链路，但不扩大范围。

### 10.2 重点问题

1. 文章生成成功但被标记为失败  
   已观察到个别文章写入正文、debug、ArticleEvidenceCard 后，仍被 `Connection error` 标记为 `generate_failed`。

2. 文章风险词  
   生成文章可能出现“唯一”“保证”“第一”“最强”等绝对化表述，需要后处理 warning。

3. Evidence retrieval 告警  
   有时因为标题、关键词转码或匹配问题出现 `NO_KEYWORD_RELATED_EVIDENCE`，需要检查中文处理和检索 query。

### 10.3 重点文件

- `apis/scheduler/article-generation.scheduler.ts`
- `apis/service/impl/llm.service.impl.ts`
- `apis/utils/evidence-retrieval.util.ts`
- `apis/utils/evidence-extraction.util.ts`
- `apis/service/impl/evidence-card.service.impl.ts`

### 10.4 具体步骤

1. 检查 scheduler 的 try/catch 逻辑。
2. 确保生成成功事务完成后，不会被后续非关键错误覆盖为失败。
3. 如果 debug、content、ArticleEvidenceCard 都已写入，应保持 `pending_review`。
4. 增加风险词扫描 warning：

```text
唯一
保证
100%
第一
最强
行业领先
权威认证
```

5. 风险词先写 warning，不自动改文章。
6. 检查 retrieval query 的中文输入来源，避免转码污染测试数据。
7. 不改 EvidenceCard 大模型抽取方向，不加向量库。

### 10.5 可能遇到的问题

- 生成失败可能来自 LLM、数据库事务、debug 写入、证据关系写入，需要分段定位。
- 不要为了修状态问题吞掉真实错误。
- 风险词 warning 不代表文章一定违法，只提示人工复核。
- 如果使用 PowerShell 造测试数据，不要直接在管道脚本里写中文。

### 10.6 验收方式

- 生成成功后文章状态是 `pending_review`。
- 失败文章确实没有可用正文，才标记 `generate_failed`。
- debug 中能看到证据 prompt 和 stats。
- ArticleEvidenceCard snapshot 正常。
- 风险词能产生 warning。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 10.7 启动提示词

```text
会话 E：EvidenceCard 与文章生成稳定性修复

你负责稳定文章生成与证据注入链路，不做引用诊断，不做前端大改。

请先阅读：
- AGENTS.md
- apis/scheduler/article-generation.scheduler.ts
- apis/service/impl/llm.service.impl.ts
- apis/utils/evidence-retrieval.util.ts
- apis/service/impl/evidence-card.service.impl.ts
- tasks/progress_tasks/2026-07-01-evidence-self-test-articles.md

目标：
修复“文章已生成但状态被标记失败”的问题，并增加基础风险词 warning。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 不引入联网搜索、向量库、ContentMission
- 不改变 EvidenceCard V1/V1.1 基本规则

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- 失败状态问题原因
- 修改点
- 风险词 warning 规则
- 验证结果
```

## 11. 会话 F：发布后自动检测闭环

### 11.1 目标

文章发布链接进入系统后，自动触发 AI 引用检测，并写入台账。

### 11.2 依赖

建议等待会话 B、会话 C 完成后执行。

### 11.3 建议实现方式

新增轻量 scheduler，不引入复杂队列。

建议文件：

- 新增 `apis/scheduler/citation-detection.scheduler.ts`
- 修改 scheduler 启动入口
- 修改 `apis/service/impl/citation-diagnosis.service.impl.ts`
- 可能新增 `apis/service/citation-detection-job.service.ts`
- 可能新增 `apis/service/impl/citation-detection-job.service.impl.ts`

### 11.4 检测触发规则

自动检测目标来自 `published_article_links`。

扫描条件建议：

- 链接未删除
- 关联文章未删除
- 文章有项目归属
- 最近 24 小时内没有对同一 articleLinkId 做过自动检测
- 每次最多处理 5 条链接
- 每条链接最多检测 2 个问题、2 个模型

第一版可以不用新增 job 表，直接通过已有 run / record 判断最近检测时间。后续数据量变大再加 job 表。

### 11.5 自动检测流程

1. scheduler 每 30 分钟执行一次。
2. 查询待检测 published links。
3. 对每个链接生成检测问题。
4. 调用自动检测公共方法。
5. 保存 run、record、mark。
6. 单条失败只记录错误，不影响其他链接。
7. 日志中不打印 API Key。

### 11.6 可能遇到的问题

- AI API 成本和速度不可控，要限制 batch size。
- 某些平台 skipped，不算失败。
- 发布链接刚出现时，搜索引擎可能还未收录，第一次检测可能无命中。
- 自动检测不能阻塞发布流程。
- 本地开发时 scheduler 可能重复启动，需要进程内 lock。
- 自动检测应避免在没有模型配置时疯狂失败重试。

### 11.7 验收方式

- 手动插入或同步一条 published link 后，scheduler 能产生 run。
- run 中有 prompt、answer、records。
- 命中 URL 时写入 mark。
- 重复启动不会并发扫同一批。
- 手动复检仍可用。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 11.8 启动提示词

```text
会话 F：发布后自动检测闭环

你负责自动检测，不做前端页面，不做 prompt 按 skill 拆分。

请先阅读：
- AGENTS.md
- apis/service/impl/citation-diagnosis.service.impl.ts
- apis/service/impl/publishing-order-sync.service.impl.ts
- apis/utils/citation-collector.util.ts
- apis/utils/citation-question-bank.util.ts
- apis/server.ts
- apis/app.ts

目标：
发布链接写入 published_article_links 后，系统能自动检测该文章是否被 AI 回答引用，并把结果写入台账。

建议：
1. 新增 citation-detection.scheduler.ts。
2. 每 30 分钟扫描待检测 published links。
3. 每轮最多处理 5 条。
4. 每条最多 2 个问题、2 个模型。
5. 24 小时内同一 articleLink 不重复自动检测。
6. 失败不影响其他链接。
7. 不打印 API Key。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 自动检测不能阻塞发布流程
- skipped 平台不算系统失败

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- scheduler 触发规则
- 防重复规则
- 失败处理方式
- 验证结果
```

## 12. 会话 G：生文 prompt 按 skill 拆分

### 12.1 目标

把文章生成 prompt 从 `llm.service.impl.ts` 中拆出，形成按 skill 管理的 prompt builder。

### 12.2 当前入口

- `apis/service/impl/llm.service.impl.ts`
- `generateArticle(params)`
- `resolveSkillDirs`
- `buildRequiredReferenceFiles`
- `systemPrompt`
- `userPrompt`

### 12.3 建议新增文件

- `apis/utils/article-prompt-builder.util.ts`

### 12.4 Prompt 分层

1. 通用生成规则

- 只输出 Markdown 正文
- 不输出过程说明
- 不输出文件路径
- 不编造事实

2. 图片规则

- 只能使用文章设置中已选图片
- 没有图片时禁止输出 Markdown 图片

3. 品牌规则

- 默认以薄云咨询为核心推荐对象
- 推荐自然、克制、可信
- 不硬广

4. EvidenceCard 规则

- 优先使用注入证据
- 不暴露内部证据字段
- 证据不足时不补造事实

5. Skill 专属规则

- ranking：排名推荐类
- comparison：对比选型类
- guide：指南方法类
- faq：问答类
- brand：品牌介绍类
- case：案例类

### 12.5 Builder 输入建议

```ts
interface BuildArticlePromptInput {
  title: string;
  keywords: string;
  articleType?: string | null;
  portrait: string;
  images: Array<{ title: string; description: string; imageUrl: string }>;
  skillDirs: string[];
  skillDisplay: string;
  evidencePromptSection: string;
  companyProjectContext: string;
  previousContent?: string;
  revisionInstruction?: string;
}
```

### 12.6 Builder 输出建议

```ts
interface BuildArticlePromptResult {
  systemPrompt: string;
  userPrompt: string;
  requiredReferenceFiles: string[];
  promptWarnings: string[];
}
```

### 12.7 迁移方式

1. 先复制现有 prompt 逻辑到 builder，不改变行为。
2. `llm.service.impl.ts` 调用 builder。
3. 确认 debug 中仍保存最终 systemPrompt / userPrompt。
4. 再逐步把 ranking 等 skill 规则拆成独立函数。
5. 不在本阶段修改前端 skill 管理。

### 12.8 可能遇到的问题

- 拆 prompt 容易导致文章质量退化，第一步必须保持行为一致。
- `requiredReferenceFiles` 现在依赖 skillDir 和关键词，迁移时要保留。
- debug 不能丢，否则后续无法排查生文问题。
- 不要把 EvidenceCard 检索挪到 builder，builder 只负责 prompt 组装。
- 旧 prompt 中有部分中文可能已经乱码，拆分前要先修复关键规则文案。

### 12.9 验收方式

- 原有文章生成可用。
- EvidenceCard 注入仍可用。
- debug 仍记录 systemPrompt、userPrompt、evidencePromptPreview。
- ranking 类文章仍遵守 TOP1 薄云咨询规则。
- 图片规则仍有效。
- `npm.cmd run lint` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。

### 12.10 启动提示词

```text
会话 G：生文 prompt 按 skill 拆分

你负责重构文章生成 prompt，不做检测台账，不做 EvidenceCard 新功能。

请先阅读：
- AGENTS.md
- apis/service/impl/llm.service.impl.ts
- apis/service/llm.service.ts
- skills/geo-content-generator-v8/SKILL.md
- version-plans/EvidenceCard-项目交接说明-2026-07-01.md

目标：
把 llm.service.impl.ts 中的大段 systemPrompt/userPrompt 拆到 article-prompt-builder.util.ts，并为后续按 skill 定制提示词打基础。

必须实现：
1. 新增 apis/utils/article-prompt-builder.util.ts。
2. Builder 返回 systemPrompt/userPrompt/requiredReferenceFiles/promptWarnings。
3. llm.service.impl.ts 保留模型调用、证据检索、debug 写入。
4. 行为先保持一致，再拆分 ranking/comparison/guide/faq/brand/case 的规则函数。
5. debug 中仍保存最终 prompt。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 不改变 EvidenceCard retrieval 逻辑
- 不让文章质量退化

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- 新 builder 的输入输出
- 拆出的规则模块
- 与旧 prompt 的兼容说明
- 验证结果
```

## 13. 会话 H：文档、验收、交接收口

### 13.1 目标

把下一阶段开发结果写清楚，方便后续维护人员继续接手。

### 13.2 重点文件

- `version-plans/`
- `tasks/progress_tasks/`
- `tasks/db.数据模型变更汇总.md`
- `tasks/fix.Bug修复汇总.md`
- `.Codex/rules.md`
- `.Codex/architecture.md`
- `.Codex/frontend.md`
- `AGENTS.md`

### 13.3 具体步骤

1. 新增版本方案文档：

```text
version-plans/V1.2-引用检测台账与自动检测.md
```

2. 新增任务记录：

```text
tasks/progress_tasks/2026-07-01-citation-diagnosis-v12.md
```

3. 如果有 schema 变更，更新：

```text
tasks/db.数据模型变更汇总.md
```

4. 如果修了 bug，更新：

```text
tasks/fix.Bug修复汇总.md
```

5. 更新 `.Codex/architecture.md`：

- 引用诊断链路
- 自动检测 scheduler
- 发布链接与引用记录关系

6. 更新 `.Codex/rules.md`：

- 不诱导 AI 强行引用我方链接
- 检测失败不阻塞发布
- 已命中的模型标签长期保留

7. 更新 `.Codex/frontend.md`：

- 检测台账页面展示规则

8. 更新 `AGENTS.md`：

- 只记录长期规则，不写临时流水账

9. 统一跑验证。

10. 汇总各会话完成度和遗留风险。

### 13.4 可能遇到的问题

- 不要把详细进度塞进 `progress.md`。
- 不要把临时测试数据写成长期规则。
- 不要重复记录已经存在的 EvidenceCard 规则。
- 如果有多个会话并行修改文档，最后要人工合并冲突。

### 13.5 验收方式

文档能让新开发者快速理解：

- 当前完成了什么
- 哪些表负责什么
- 检测怎么触发
- 台账怎么看
- 后续不要做什么

验证：

- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`

### 13.6 启动提示词

```text
会话 H：文档、验收、交接收口

你负责下一阶段文档、任务记录和最终验收，不实现核心业务功能。

请先阅读：
- AGENTS.md
- version-plans/EvidenceCard-项目交接说明-2026-07-01.md
- tasks/db.数据模型变更汇总.md
- tasks/fix.Bug修复汇总.md
- .Codex/rules.md
- .Codex/architecture.md
- .Codex/frontend.md

目标：
把引用检测台账、自动检测、prompt 按 skill 拆分、EvidenceCard 稳定性工作的结果记录清楚，方便后续人员接手。

必须遵守：
- 不修改 .agents/
- 不运行 seed
- 不运行 pnpm test
- 不推送
- 进度详情写入 tasks/progress_tasks/
- progress.md 如存在只做索引
- AGENTS.md 只写长期规则

需要完成：
1. 新增 version-plans/V1.2-引用检测台账与自动检测.md。
2. 新增 tasks/progress_tasks/2026-07-01-citation-diagnosis-v12.md。
3. 更新 db/fix 汇总。
4. 更新 .Codex/rules.md、architecture.md、frontend.md。
5. 更新 AGENTS.md。
6. 汇总验证结果和遗留问题。

验收：
- npm.cmd run lint
- npx.cmd tsc -p tsconfig.api.json --noEmit

完成后返回：
- 更新文档列表
- 新增长期规则
- 验证结果
- 仍未完成事项
```

## 14. 需要人工参与的事项

### 14.1 确认检测平台范围

第一版建议只启用 1-2 个稳定模型，避免 API 成本过高和失败率过高。

需要确认：

- 哪些模型有联网搜索能力
- 哪些模型 API Key 已配置
- 哪些模型适合作为正式检测平台

### 14.2 提供真实发布链接

至少准备 3-5 个已经发布成功的文章链接，用于检测台账验收。

链接最好覆盖：

- 不同发布平台
- 不同文章类型
- 不同关键词方向

### 14.3 确认检测问题方向

需要确认薄云咨询最希望被 AI 推荐或引用的关键词方向，例如：

- AI 转型咨询
- 管理咨询公司推荐
- FDE
- AI Agent 落地
- 企业数字化转型
- 研发管理咨询
- 战略解码

### 14.4 确认命中判断标准

第一版建议只把“AI 来源 URL 与我方发布 URL 标准化后相同”算作命中。

暂不把以下情况算作正式命中：

- 只出现同域名
- 只出现相似标题
- 只出现转载摘要
- 没有 URL 的来源标题

这些可以后续做弱匹配版本。

### 14.5 确认自动检测频率

第一版建议：

- 每 30 分钟扫描一次
- 每轮最多 5 条链接
- 每条链接最多 2 个问题
- 每条链接最多 2 个模型

后续根据 API 成本和检测效果再调整。

## 15. 最终整体验收标准

下一阶段完成后，应达到：

1. `/citation-diagnosis` 页面无乱码。
2. 台账能展示发布文章、发布链接、引用模型、命中次数。
3. 点击详情能看到 AI 回答、检测问题、引用来源、命中片段。
4. 手动复检可用。
5. 发布链接进入系统后可自动检测。
6. 检测失败不会影响发布流程。
7. 命中过的模型标签长期保留。
8. 生文 prompt 已按 builder 拆分，后续 skill 可扩展。
9. EvidenceCard 注入、debug、snapshot 仍正常。
10. `npm.cmd run lint` 通过。
11. `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。
12. 没有 seed。
13. 没有误改 `.agents/`。
14. 没有未经确认推送。

