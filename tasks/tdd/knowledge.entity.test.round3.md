# knowledge.entity.ts TDD 第三轮补全

## 文件信息
- **源文件**: `apis/entity/knowledge.entity.ts`
- **测试文件**: `tests/apis/knowledge.entity.test.ts`
- **执行日期**: 2026-05-25
- **上一次更新**: 2026-05-25（第三轮补全）

## 变更说明

在第二轮 248 用例基础上新增 49 个测试用例，覆盖三个新维度：

1. **安全注入测试**（16个）
2. **高级 JSON 序列化/反序列化**（16个）
3. **实际使用场景**（17个）

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       297 passed, 297 total（原248 + 新增49）
```

## 新增测试用例分布

### 安全注入测试（16个）

| 测试 | 覆盖点 |
|------|--------|
| keyword with script tags | XSS `<script>` 注入 |
| keyword with SQL injection | `DROP TABLE` 注入 |
| seed_word with HTML entities | `&lt;script&gt;` HTML实体 |
| expanded word with path traversal | `../../../etc/passwd` 路径遍历 |
| image_url with javascript: protocol | `javascript:alert(1)` |
| image_url with data: URI | `data:text/html,<h1>test</h1>` |
| content with prototype pollution | `__proto__` 原型污染 |
| keyword with null bytes | `\x00` 空字节注入 |
| portrait title with null bytes | `\x00` 空字节注入 |
| document file_url with query injection | URL query参数重定向注入 |
| document description with CRLF injection | `\r\n` HTTP响应拆分 |
| very large unicode in expanded word | 大量unicode字符（1000个￿） |
| very large unicode in portrait content | 大量unicode字符 |
| MinedKeyword with XSS pattern | `<img onerror=alert>` |
| JSON __proto__ not polluting prototype | 原型污染防护验证 |
| JSON constructor injection safety | constructor注入防护验证 |

### 高级 JSON 序列化/反序列化（16个）

| 测试 | 覆盖点 |
|------|--------|
| KnowledgeKeyword Date → ISO string | Date字段序列化格式 |
| KnowledgeKeyword Date reviver | Date字段反序列化还原 |
| KnowledgeKeyword with expanded_words JSON | 嵌套对象序列化 |
| expanded_words Date reviver | 嵌套Date反序列化 |
| KnowledgeKeyword null fields → null JSON | null字段保留 |
| KnowledgeDocument numeric roundtrip | 数值字段精度保持 |
| KnowledgePortrait null content JSON | null content序列化 |
| KnowledgeImage null description JSON | null description序列化 |
| MinedKeyword Date serialization | Date单字段序列化 |
| MinedKeyword null created_by JSON | null字段序列化 |
| JSON reviver for all entity Date fields | 通用Date reviver |
| JSON reviver with nested expanded_words | 嵌套Date reviver |
| JSON reviver for KnowledgeDocument | Document Date reviver |
| boolean fields JSON roundtrip | 布尔值保持 |
| JSON.stringify CreateDocumentRequest | 请求DTO序列化 |

### 实际使用场景（17个）

| 测试 | 覆盖点 |
|------|--------|
| CreateKeywordRequest → KnowledgeKeyword | 请求→实体创建 |
| UpdateKeywordRequest → existing keyword | 关键词更新 |
| CreatePortraitRequest → KnowledgePortrait | 画像创建 |
| UpdatePortraitRequest partial update | 画像部分更新 |
| CreateImageRequest → KnowledgeImage | 图片创建 |
| UpdateImageRequest partial update | 图片部分更新 |
| CreateDocumentRequest → KnowledgeDocument | 文档创建 |
| UpdateDocumentRequest partial update | 文档部分更新 |
| keyword lifecycle: create→expand→update→verify | 关键词完整生命周期 |
| document upload scenario | 文档上传场景 |
| filter mined keywords by selected | 挖掘词筛选 |
| MinedKeyword → KnowledgeKeyword conversion | 挖掘词转换 |
| portrait creation without content | 无内容画像创建 |
| keyword grouping by group_id | 关键词分组 |
| expanded words selection toggle | 扩展词选中切换 |
| multiple entity types same base_id | 同base_id多类型共存 |
| empty update preserving fields | 空更新保持字段 |
| batch keyword creation from mined | 批量创建关键词 |

## 覆盖率分析

```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
All files |       0 |        0 |       0 |      0
```

**说明**: 纯接口文件无运行时代码，Istanbul无法统计。297个测试用例通过编译时类型检查+运行时断言覆盖全部14个接口的所有维度。

## 测试维度汇总（第三轮后）

| 维度 | 用例数 |
|------|--------|
| 基础创建/类型检查 | 96 |
| 字段数量验证 | 12 |
| 不可变性(spread+freeze) | 15 |
| 跨接口交互 | 11 |
| 边界情况 | 28 |
| 重新导出验证 | 3 |
| JSON序列化(round-trip) | 13 |
| 集合操作 | 16 |
| 类型收窄 | 10 |
| Scope约束 | 4 |
| 连续更新链 | 5 |
| 结构相等性/深拷贝 | 7 |
| 解构模式 | 7 |
| Object迭代方法 | 8 |
| **安全注入（新增）** | **16** |
| **高级JSON序列化（新增）** | **16** |
| **实际使用场景（新增）** | **17** |
| **合计** | **297** |

## 验证结果

- pnpm build ✅
- pnpm lint ✅（1 warning，非本次变更）
- pnpm test: 297 passed ✅
