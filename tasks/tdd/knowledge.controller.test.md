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
| Statements | 94.91% |
| Branch | 84.69% |
| Functions | 97.67% |
| Lines | **100%** |

## 测试总数
178 个测试，全部通过

## 测试分布

### Auth & Role Guards（7个）
- 未登录访问关键词列表返回401
- view角色访问关键词/画像/图片/文档列表返回403
- view角色访问知识清单返回403
- view角色访问项目关键词返回403

### Keywords CRUD（30个）
- listKeywords: 成功获取列表、无效baseId返回400、服务异常返回500
- getKeyword: 成功获取详情、无效baseId/id返回400、baseId不匹配返回404、关键词不存在返回404、服务异常返回500
- createKeyword: 成功创建、无效baseId返回400、keyword为空返回400、知识库不存在返回404、服务异常返回500
- updateKeyword: sysadmin/创建者成功更新、无效参数返回400、baseId不匹配返回404、非创建者返回403、keyword为空返回400、关键词不存在返回404
- deleteKeyword: sysadmin/创建者成功删除、无效参数返回400、baseId不匹配返回404、非创建者返回403、关键词不存在返回404
- batchCreateKeywords: 成功批量创建、无效baseId返回400、keywords非数组/空数组返回400、服务异常返回500
- expandKeywords: 无效baseId返回400、keyword为空返回400、成功扩词返回关键词列表、LLM调用失败返回500

### Portraits CRUD（23个）
- listPortraits: 成功获取列表、无效baseId返回400、服务异常返回500
- getPortrait: 成功获取详情、无效参数返回400、baseId不匹配返回404、画像不存在返回404、服务异常返回500
- createPortrait: 成功创建、无效baseId返回400、title/content为空返回400、知识库不存在返回404、服务异常返回500
- updatePortrait: sysadmin成功更新、无效参数返回400、baseId不匹配返回404、非创建者返回403、画像不存在返回404
- deletePortrait: sysadmin成功删除、无效baseId返回400、baseId不匹配返回404、非创建者返回403、画像不存在返回404

### Images CRUD（28个）
- listImages: 成功获取列表、无效baseId返回400、服务异常返回500
- getImage: 成功获取详情、无效参数返回400、baseId不匹配返回404、图片不存在返回404、服务异常返回500
- createImage: 成功创建、无效baseId返回400、title/image_url为空返回400、标题重复返回400、图片URL重复返回400、知识库不存在返回404、服务异常返回500
- updateImage: sysadmin成功更新、无效参数返回400、baseId不匹配返回404、非创建者返回403、新标题重复返回400、图片不存在返回404
- deleteImage: sysadmin成功删除、无效baseId返回400、baseId不匹配返回404、非创建者返回403、图片不存在返回404

### Documents CRUD（27个）
- listDocuments: 成功获取列表、无效baseId返回400、服务异常返回500
- getDocument: 成功获取详情、无效参数返回400、baseId不匹配返回404、文档不存在返回404、服务异常返回500
- createDocument: 成功创建、无效baseId返回400、title/file_url/file_name/file_type/file_size为空返回400、标题重复返回400、文件URL重复返回400、知识库不存在返回404、服务异常返回500
- updateDocument: sysadmin成功更新、无效参数返回400、baseId不匹配返回404、非创建者返回403、新标题重复返回400、文档不存在返回404
- deleteDocument: sysadmin成功删除、无效baseId返回400、baseId不匹配返回404、非创建者返回403、文档不存在返回404

### checkBaseAccess 权限控制（6个）
- admin访问company范围知识库（同公司）成功
- admin访问company范围知识库（不同公司）返回404
- admin访问company范围知识库（用户不存在）返回404
- admin访问project范围知识库（是运营者）成功
- admin访问project范围知识库（无project_id）返回404
- admin访问project范围知识库（非运营者）返回500

### Project Knowledge Aggregation（8个）
- listProjectKeywords: admin(运营者)成功获取、admin(非运营者)返回403、无效projectId返回400
- listProjectPortraits: admin(运营者)成功获取、无效projectId返回400、服务异常返回500
- listProjectImages: admin(运营者)成功获取、无效projectId返回400、服务异常返回500
- listProjectDocuments: admin(运营者)成功获取、无效projectId返回400、服务异常返回500

### Knowledge Inventory（8个）
- 无知识库时返回空统计
- 成功获取知识清单含统计数据
- 支持category过滤
- 服务异常返回500
- 含图片和文档（有创建者）的知识清单
- 搜索文档时使用OR条件匹配文件名
- 所有条目无创建者时显示"-"
- 部分条目有创建者部分无创建者正确显示名称

### Mined Keywords 挖掘关键词（18个）
- listMinedKeywords: 成功获取列表、无效baseId返回400、服务异常返回500
- mineKeywords: 无效baseId返回400、知识库无内容返回400、服务异常返回500、成功挖掘关键词
- saveMinedKeywords: 无效baseId返回400、keywords非数组/空数组返回400、服务异常返回500、成功保存
- toggleMinedKeywordsBatch: 无效baseId返回400、ids非数组/空数组返回400、服务异常返回500、成功批量切换
- deleteMinedKeywords: 成功清空、无效baseId返回400、服务异常返回500

## 本次新增测试（23个）
在原有155个测试基础上新增23个测试：
1. checkBaseAccess company scope（3个）
2. checkBaseAccess project scope（3个）
3. expandKeywords 成功路径 + LLM错误路径（2个）
4. listProjectKeywords 成功 + 非运营者403（2个）
5. listProjectPortraits 成功路径（1个）
6. listProjectImages 成功路径（1个）
7. listProjectDocuments 成功路径（1个）
8. listProjectPortraits/Images/Documents 服务异常500（3个）
9. listInventory 图片/文档有创建者（1个）
10. listInventory 搜索文档OR条件（1个）
11. listInventory 无创建者（1个）
12. listInventory 混合创建者（1个）
13. mineKeywords 成功路径（1个）
14. saveMinedKeywords 成功路径（1个）
15. toggleMinedKeywordsBatch 成功路径（1个）

## 关键测试场景
- **权限控制**: sysadmin/admin/view 三角色访问控制
- **checkBaseAccess**: platform/company/project 三种范围权限检查
- **checkProjectOperator**: 项目运营者身份验证
- **CRUD完整路径**: 创建/读取/更新/删除的成功和失败路径
- **输入验证**: 参数缺失、类型错误、ID无效等
- **业务规则**: 只能修改/删除自己创建的资源（sysadmin除外）
- **LLM集成**: expandKeywords/mineKeywords 的成功和失败路径
- **知识清单**: 多类型聚合、分页、搜索、创建者名称映射
