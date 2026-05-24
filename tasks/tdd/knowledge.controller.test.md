# TDD 执行报告 - knowledge.controller.test.ts

## 测试文件
`tests/apis/knowledge.controller.test.ts`

## 被测文件
`apis/controller/knowledge.controller.ts`

## 测试执行日期
2026-05-24

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 98.56% |
| Branch | 93.66% |
| Functions | **100%** |
| Lines | **100%** |

## 测试总数
239 个测试，全部通过

## 本次修复的 Bug
1. 修复 45 个测试用例中 API 路径前缀错误（`/api/` → `/api/v1/`，含 knowledge-bases、knowledge-inventory、projects）
2. 添加 `jest.mock('anti-crawl.middleware')` 解决 223+ 测试运行时触发 anti-crawl IP 封锁问题（200次请求阈值导致后续测试返回 403）
3. 修复 auth 编译错误：补充 `PermissionDeniedError` 类到 `user.entity.ts` 和 `index.ts`，补充 `getLatestUserState` 方法到 `AuthServiceImpl`

## 新增测试用例（16个）

### 错误分支覆盖
- updateKeyword 中 service.findFirst 返回 null 抛出关键词不存在（404）
- deleteKeyword 中 service.findFirst 返回 null 抛出关键词不存在（404）
- listProjectPortraits 服务异常返回 500
- listProjectImages 服务异常返回 500
- listProjectDocuments 服务异常返回 500
- mineKeywords 中 checkBaseAccess 抛出知识库不存在（404）

### 参数验证覆盖
- getPortrait 无效的画像 ID（400）
- getImage 无效的图片 ID（400）
- getDocument 无效的文档 ID（400）

### 知识清单（Inventory）覆盖
- 按 category=portrait 分类查询显示创建者名称
- 按 category=image 分类查询显示创建者名称
- 按 category=document 分类查询显示创建者名称
- 搜索文档时使用 OR 条件查询标题和文件名
- 创建者 ID 存在但用户表中无记录时显示"-"

### 关键词挖掘覆盖
- 不指定 source_type 默认为 all（含 LLM axios mock）
- 挖掘关键词包含描述字段（含 LLM axios mock）

## 测试分布

### Auth & Role Guards（7个）
- 未登录访问关键词/画像/图片/文档列表返回 401
- view 角色访问各端点返回 403

### Keywords CRUD（32个）
- listKeywords: 成功列表、无效baseId(400)、服务异常(500)
- getKeyword: 成功详情、无效baseId/id(400)、baseId不匹配(404)、不存在(404)、服务异常(500)
- createKeyword: 成功创建(201)、无效baseId(400)、keyword为空(400)、知识库不存在(404)、服务异常(500)
- updateKeyword: sysadmin/创建者成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、keyword为空(400)、不存在(404)、error catch(404)
- deleteKeyword: sysadmin/创建者成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、不存在(404)、error catch(404)
- batchCreateKeywords: 成功批量、无效baseId(400)、非数组/空数组(400)、服务异常(500)
- expandKeywords: 无效baseId(400)、keyword为空(400)

### Portraits CRUD（24个）
- listPortraits: 成功列表、无效baseId(400)、服务异常(500)
- getPortrait: 成功详情、无效baseId/id(400)、baseId不匹配(404)、不存在(404)、服务异常(500)
- createPortrait: 成功创建(201)、无效baseId(400)、title/content为空(400)、知识库不存在(404)、服务异常(500)
- updatePortrait: sysadmin成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、不存在(404)、服务异常(500)
- deletePortrait: sysadmin/创建者成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、不存在(404)、服务异常(500)

### Images CRUD（30个）
- listImages: 成功列表、无效baseId(400)、服务异常(500)
- getImage: 成功详情、无效baseId/id(400)、baseId不匹配(404)、不存在(404)、服务异常(500)
- createImage: 成功创建(201)、无效baseId(400)、title/image_url为空(400)、标题重复(400)、URL重复(400)、知识库不存在(404)、服务异常(500)
- updateImage: sysadmin成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、标题重复(400)、不存在(404)、服务异常(500)
- deleteImage: sysadmin/创建者成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、不存在(404)、服务异常(500)

### Documents CRUD（29个）
- listDocuments: 成功列表、无效baseId(400)、服务异常(500)
- getDocument: 成功详情、无效baseId/id(400)、baseId不匹配(404)、不存在(404)、服务异常(500)
- createDocument: 成功创建(201)、无效baseId(400)、各字段为空(400)、标题重复(400)、URL重复(400)、知识库不存在(404)、服务异常(500)
- updateDocument: sysadmin成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、标题重复(400)、不存在(404)、服务异常(500)
- deleteDocument: sysadmin/创建者成功、无效参数(400)、baseId不匹配(404)、非创建者(403)、不存在(404)、服务异常(500)

### checkBaseAccess 权限控制（8个）
- admin 访问 platform 范围知识库成功
- admin 访问 company 范围（同公司/不同公司/用户不存在）
- admin 访问 project 范围（运营者/无project_id/非运营者）

### Project Knowledge Aggregation（10个）
- listProjectKeywords: sysadmin成功、admin成功、服务异常(500)
- listProjectPortraits: admin成功、服务异常(500)
- listProjectImages: admin成功、服务异常(500)
- listProjectDocuments: admin成功、服务异常(500)

### Knowledge Inventory（12个）
- 无知识库时返回空统计
- 成功获取含统计数据
- 支持 category 过滤（keyword/portrait/image/document）
- 搜索关键词/画像/图片/文档
- 分页参数正确工作
- 无创建者ID跳过批量查询
- 多知识库合并展示
- 创建者不在用户表时显示"-"

### Mined Keywords 挖掘关键词（18个）
- listMinedKeywords: 成功列表、知识库不存在(404)
- mineKeywords: 各 source_type(document/portrait/image/all)、默认source_type、知识库不存在(404)、无内容(400)
- saveMinedKeywords: 成功保存、含重复、知识库不存在(404)
- toggleMinedKeywordsBatch: 成功批量切换、知识库不存在(404)
- deleteMinedKeywords: 成功清空、知识库不存在(404)

### Error Catch Branches（10个）
- listKeywords/getKeyword/createKeyword/createPortrait/createImage/createDocument 中 checkBaseAccess 抛出知识库不存在
- saveMinedKeywords/toggleMinedKeywordsBatch/deleteMinedKeywords/listMinedKeywords 中 checkBaseAccess 抛出知识库不存在

## 未覆盖分支说明
- 可选链 fallback 分支（`base?.name || '-'` 中 base 为 undefined 的路径）
- 部分错误 catch 中 `err.message !== 'xxx'` 的 else 分支
- 这些分支在测试 mock 污染环境下难以精确触发
