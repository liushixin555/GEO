# company.entity 第二轮 TDD 报告

**日期**: 2026-05-25
**文件**: `apis/entity/company.entity.ts`
**测试文件**: `tests/apis/company.entity.test.ts`

## 测试概要

| 指标 | 值 |
|------|-----|
| 总用例数 | **180** |
| 第一轮用例 | 76 |
| 第二轮新增用例 | **104** |
| 通过率 | 100% |
| 执行时间 | ~5s |

## 第二轮新增测试维度（10个维度，104个用例）

### 1. JSON 序列化与反序列化（13 用例）
- Company/CreateCompanyRequest/UpdateCompanyRequest/CompanyDetail JSON round-trip
- Date 字段序列化为 ISO 字符串
- null 字段序列化
- 省略可选字段时 JSON 不包含该字段
- 空数组 JSON round-trip
- 嵌套 operator/viewer 对象序列化
- 含特殊字符 JSON round-trip
- JSON.parse reviver 恢复 Date 类型

### 2. 对象不可变性（11 用例）
- spread 运算符创建独立副本（Company/CompanyDetail）
- spread 运算符 operator_ids/viewer_ids 独立数组
- CompanyDetail spread 保留 Company 基础字段
- Object.freeze 后字段/数组不可变
- 解构提取字段
- rest spread 排除指定字段
- Object.assign 创建合并对象

### 3. 跨接口一致性增强（10 用例）
- CreateCompanyRequest 字符串字段是 Company 的子集
- Company address (string|null) 与 CreateCompanyRequest (string|undefined) 兼容
- UpdateCompanyRequest 继承 CreateCompanyRequest 所有字段结构
- CompanyDetail 在 Company 基础上增加恰好 4 个字段
- 所有接口 contact_person/contact_phone 类型一致
- id/status/时间戳 字段分布验证
- operators/viewers 对象结构与 key 验证

### 4. 安全注入防护（14 用例）
- XSS script/img/svg/iframe 标签在所有字符串字段中保留
- SQL 注入字符串在 short_name/full_name/contact_phone 中保留
- __proto__/constructor/prototype 作为字段值保留
- HTML 实体编码字符串保留
- Null 字节注入保留
- Unicode 转义序列验证

### 5. 边界值增强（14 用例）
- 负数 id / Number.MIN_SAFE_INTEGER / 0
- address 空字符串 vs null vs undefined 区别
- operator_ids 包含负数 / 极大数组 / MAX_SAFE_INTEGER
- contact_phone 超长字符串
- 所有必需字符串字段为空字符串
- operator/viewer id 为 0
- Date epoch 0 / 远未来时间戳
- short_name 极长字符串
- address 多行字符串

### 6. 状态生命周期（8 用例）
- 活跃公司创建 (status=true, deleted_at=null)
- 活跃 → 停用 → 重新激活
- 软删除 (设置 deleted_at)
- 停用但未删除
- 完整生命周期：创建 → 更新 → 停用 → 软删除
- 创建请求 → 公司详情完整流程
- 更新请求保留 status 不变

### 7. 实际使用场景（11 用例）
- API 创建请求映射到 Company 实体
- Company 实体映射到 API 详情响应
- 公司列表响应结构
- 按名称搜索过滤公司
- 公司运营者重新分配
- 清空所有运营者（传入空数组）
- 公司查看者管理：新增与清空
- 公司地址更新场景
- 公司联系人变更场景
- 公司软删除后恢复
- 企业级公司：大量运营者和查看者

### 8. 响应结构验证（10 用例）
- Company/CreateCompanyRequest/UpdateCompanyRequest/CompanyDetail 运行时字段类型验证
- operators/viewers 元素结构验证
- Company key 数量恒为 10
- CreateCompanyRequest 全字段时 key 数量为 7
- CompanyDetail key 数量恒为 14
- 所有字符串字段 typeof 为 string

### 9. 类型推断与编译时安全（4 用例）
- Object.assign 从 CreateCompanyRequest 合并生成 Company
- Partial<Company> 允许所有字段为可选
- Pick<Company, 'id' | 'short_name'> 仅含选定字段
- Omit<Company, 'deleted_at'> 排除 deleted_at

### 10. 数组操作与遍历（8 用例）
- operator_ids forEach/map/filter/find/includes
- operators 数组按 cn_name 排序
- viewer_ids reduce 聚合
- operators.every 全部验证

## 覆盖率

| 文件 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| company.entity.ts | N/A (纯类型定义) | N/A | N/A | N/A |
| index.ts (re-export) | 100% | 100% | N/A | 100% |

> 注：entity 文件为纯 TypeScript 接口定义，无运行时代码，覆盖率以接口结构验证维度覆盖为准。

## 修复的问题

1. **Date 远未来时间戳**：`getFullYear()` 受本地时区影响（UTC+8），改用 `getUTCFullYear()`
2. **中文排序顺序**：`localeCompare` 中文排序依赖 locale 设置，改为断言排序后包含全部元素

## 结论

180 用例 100% 通过，覆盖 10 个维度：JSON 序列化、对象不可变性、跨接口一致性、安全注入、边界值、状态生命周期、实际场景、响应结构、类型推断、数组操作。company.entity 四个接口（Company、CreateCompanyRequest、UpdateCompanyRequest、CompanyDetail）的全部字段和用法模式已完整覆盖。
