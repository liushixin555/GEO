# article.schema.ts TDD 测试报告

## 源文件
`apis/schema/article.schema.ts`

## 测试文件
`tests/apis/article.schema.test.ts`

## 测试日期
2026-05-24

## 测试结果
**157 通过 / 0 失败 / 100% 覆盖率**

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
article.schema.ts  |     100 |      100 |     100 |    100
```

## 测试用例清单

### articleStatusSchema（17 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1-8 | 应接受有效状态 "draft"/"manual_writing"/"generating"/"generate_failed"/"pending_review"/"publishing"/"publish_failed"/"published" | 8个合法枚举值正向验证 |
| 9 | 应拒绝无效状态字符串 | 非法字符串 |
| 10 | 应拒绝空字符串 | 空串边界 |
| 11 | 应拒绝数字 | 类型错误 |
| 12 | 应拒绝 null | null 类型 |
| 13 | 应拒绝 undefined | undefined 类型 |
| 14 | 应拒绝数组 | 数组类型 |
| 15 | 应拒绝对象 | 对象类型 |
| 16 | 应拒绝大小写不匹配的状态 | 大小写敏感 |
| 17 | 应提取正确的枚举选项 | options 属性验证 |

### createArticleSchema（49 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应接受空对象（所有字段可选） | 全可选验证 |
| **title** | | |
| 2 | 应接受有效标题 | 正向验证 |
| 3 | 应接受空字符串 | 空串边界 |
| 4 | 应接受最长500字符标题 | max 边界 |
| 5 | 应拒绝超过500字符的标题 | max+1 越界 |
| 6 | 应接受 unicode 标题 | unicode 支持 |
| **article_type** | | |
| 7 | 应接受有效 article_type | 正向验证 |
| 8 | 应接受最长50字符 | max 边界 |
| 9 | 应拒绝超过50字符 | max+1 越界 |
| **write_mode** | | |
| 10 | 应接受有效 write_mode | 正向验证 |
| 11 | 应接受最长50字符 | max 边界 |
| 12 | 应拒绝超过50字符 | max+1 越界 |
| **keywords** | | |
| 13 | 应接受有效关键词 | 正向验证 |
| 14 | 应接受最长500字符 | max 边界 |
| 15 | 应拒绝超过500字符 | max+1 越界 |
| **portrait** | | |
| 16 | 应接受有效画像 | 正向验证 |
| 17 | 应接受最长2000字符 | max 边界 |
| 18 | 应拒绝超过2000字符 | max+1 越界 |
| **images** | | |
| 19 | 应接受有效图片数组 | 正向验证 |
| 20 | 应接受空数组 | 空数组 |
| 21 | 应接受 null | null 值 |
| 22 | 应接受最多20张图片 | max 边界 |
| 23 | 应拒绝超过20张图片 | max+1 越界 |
| 24 | 应接受最长2000字符的图片URL | 字符串 max 边界 |
| 25 | 应拒绝超过2000字符的图片URL | 字符串 max+1 越界 |
| 26 | 应拒绝非数组非null的 images | 类型错误 |
| **platforms** | | |
| 27 | 应接受有效平台数组 | 正向验证 |
| 28 | 应接受 null | null 值 |
| 29 | 应接受最多10个平台 | max 边界 |
| 30 | 应拒绝超过10个平台 | max+1 越界 |
| 31 | 应接受最长100字符的平台名 | 字符串 max 边界 |
| 32 | 应拒绝超过100字符的平台名 | 字符串 max+1 越界 |
| **skills** | | |
| 33 | 应接受有效技能ID数组 | 正向验证 |
| 34 | 应接受 null | null 值 |
| 35 | 应接受空数组 | 空数组 |
| 36 | 应接受最多50个技能ID | max 边界 |
| 37 | 应拒绝超过50个技能ID | max+1 越界 |
| 38 | 应接受 0 作为合法ID | 0 边界 |
| 39 | 应拒绝负数技能ID | 负数越界 |
| 40 | 应拒绝浮点数技能ID | 浮点数类型 |
| 41 | 应拒绝字符串技能ID | 字符串类型 |
| **llm_model_id** | | |
| 42 | 应接受有效模型ID | 正向验证 |
| 43 | 应接受 null | null 值 |
| 44 | 应接受 0 | 0 边界 |
| 45 | 应拒绝负数 | 负数越界 |
| 46 | 应拒绝浮点数 | 浮点数类型 |
| **content** | | |
| 47 | 应接受有效内容 | 正向验证 |
| 48 | 应接受空字符串 | 空串 |
| 49 | 应接受最长500000字符 | max 边界 |
| **status** | | |
| 50 | 应接受 draft | 合法状态 |
| 51 | 应接受 generating | 合法状态 |
| 52 | 应接受 manual_writing | 合法状态 |
| 53 | 应拒绝 create 不允许的状态（如 published） | 不允许的状态 |
| 54 | 应拒绝 invalid 状态 | 非法状态 |
| **strict** | | |
| 55 | 应拒绝未知字段 | strict 模式 |
| 56 | 应拒绝未知字段即使有有效字段 | strict 模式 |
| **完整对象** | | |
| 57 | 应接受所有字段 | 完整正向验证 |

### updateArticleSchema（35 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应接受空对象 | 全可选验证 |
| **继承字段约束** | | |
| 2 | 应接受最长500字符标题 | max 边界 |
| 3 | 应拒绝超过500字符标题 | max+1 越界 |
| 4 | 应接受最长50字符 article_type | max 边界 |
| 5 | 应拒绝超过50字符 article_type | max+1 越界 |
| **status** | | |
| 6-13 | 应允许更新状态为 draft/manual_writing/generating/generate_failed/pending_review/publishing/publish_failed/published | 8个合法状态 |
| 14 | 应拒绝无效状态 | 非法值 |
| **scheduled_publish_at** | | |
| 15 | 应接受未来时间的 ISO datetime 带偏移 | 正向 Z 格式 |
| 16 | 应接受带 +08:00 偏移的未来时间 | 正向偏移格式 |
| 17 | 应拒绝过去的 scheduled_publish_at | 过去时间 refine |
| 18 | 应接受 null | null 值 |
| 19 | 应拒绝非 datetime 格式字符串 | 格式错误 |
| 20 | 应拒绝不带偏移的日期字符串 | 格式错误 |
| **schedule_type** | | |
| 21 | 应接受 "asap" | 合法枚举 |
| 22 | 应接受 "scheduled" | 合法枚举 |
| 23 | 应接受 "after" | 合法枚举 |
| 24 | 应接受 null | null 值 |
| 25 | 应拒绝无效值 | 非法值 |
| **可空数组字段** | | |
| 26-28 | 应接受 null images/platforms/skills | null 值 |
| 29 | 应拒绝超过20张图片 | max+1 越界 |
| 30 | 应拒绝超过10个平台 | max+1 越界 |
| 31 | 应拒绝超过50个技能ID | max+1 越界 |
| 32 | 应拒绝负数技能ID | 负数越界 |
| **llm_model_id** | | |
| 33 | 应接受 null | null 值 |
| 34 | 应拒绝负数 | 负数越界 |
| **strict** | | |
| 35 | 应拒绝未知字段 | strict 模式 |

### reviewArticleSchema（7 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应接受 approved: true | 正向通过 |
| 2 | 应接受 approved: false | 正向拒绝 |
| 3 | 应拒绝缺少 approved 字段 | 缺必填字段 |
| 4 | 应拒绝字符串 "true" | 类型错误 |
| 5 | 应拒绝数字 1 | 类型错误 |
| 6 | 应拒绝 null | null 类型 |
| 7 | 应拒绝未知字段（strict） | strict 模式 |

### updateContentSchema（11 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应接受有效内容 | 正向验证 |
| 2 | 应接受最长500000字符 | max 边界 |
| 3 | 应拒绝空字符串（min 1） | min 边界 |
| 4 | 应拒绝超过500000字符 | max+1 越界 |
| 5 | 应拒绝缺少 content 字段 | 缺必填字段 |
| 6 | 应拒绝非字符串 content | 类型错误 |
| 7 | 应拒绝 null content | null 类型 |
| 8 | 应拒绝未知字段（strict） | strict 模式 |
| 9 | 应接受包含 HTML 的内容 | HTML 支持 |
| 10 | 应接受包含 unicode 的内容 | unicode 支持 |
| 11 | 应接受单字符内容 | min 边界 |

### listArticlesSchema（38 用例）
| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应使用默认值（page=1, pageSize=10） | 默认值验证 |
| **page** | | |
| 2 | 应接受有效页码 | 正向验证 |
| 3 | 应接受大页码 | 大数值 |
| 4 | 应将字符串页码强制转换为数字（coerce） | coerce 转换 |
| 5 | 应拒绝小于1的页码 | min 越界 |
| 6 | 应拒绝负页码 | 负数 |
| 7 | 应拒绝非整数页码 | 浮点数 |
| **pageSize** | | |
| 8 | 应接受有效 pageSize | 正向验证 |
| 9 | 应接受最大值100 | max 边界 |
| 10 | 应接受最小值1 | min 边界 |
| 11 | 应将字符串 pageSize 强制转换 | coerce 转换 |
| 12 | 应拒绝超过100的 pageSize | max+1 越界 |
| 13 | 应拒绝小于1的 pageSize | min-1 越界 |
| 14 | 应拒绝非整数 pageSize | 浮点数 |
| **search** | | |
| 15 | 应接受有效搜索字符串 | 正向验证 |
| 16 | 应接受最长200字符 | max 边界 |
| 17 | 应拒绝超过200字符 | max+1 越界 |
| **status** | | |
| 18-25 | 应接受状态 draft/manual_writing/generating/generate_failed/pending_review/publishing/publish_failed/published | 8个合法状态 |
| 26 | 应拒绝无效状态 | 非法值 |
| **非 strict** | | |
| 27 | 应允许未知字段（无 strict） | 非 strict 行为 |
| **完整查询** | | |
| 28 | 应接受所有查询参数 | 完整正向验证 |
| 29 | 应正确强制转换字符串数字参数 | coerce 组合 |

## 覆盖率总结
- **Statements**: 100%
- **Branch**: 100%
- **Functions**: 100%
- **Lines**: 100%

## 测试覆盖维度
1. **正向验证**：所有合法值和边界值
2. **负向验证**：非法类型、越界值、空值、null、undefined
3. **边界值测试**：max/min 边界的 +1/-1 测试
4. **strict 模式**：验证未知字段被拒绝
5. **refine 验证**：scheduled_publish_at 的过去时间拒绝
6. **coerce 转换**：字符串到数字的强制转换
7. **类型安全**：数字/字符串/布尔值/null/数组/对象的类型拒绝
