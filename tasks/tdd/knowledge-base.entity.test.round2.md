# knowledge-base.entity TDD 第二轮

**日期**: 2026-05-25
**文件**: `tests/apis/knowledge-base.entity.test.ts`
**源文件**: `apis/entity/knowledge-base.entity.ts`

## 测试结果

- **总用例**: 208 (第一轮 137 + 第二轮新增 71)
- **通过率**: 100% (208/208)
- **覆盖率**: 纯 interface 文件无运行时代码，通过编译时类型检查和运行时断言验证

## 第二轮新增测试维度

### 1. 对象不可变性 (11 用例)
- spread 创建副本独立性
- Date 引用共享（浅拷贝验证）
- Object.freeze 后修改抛出 TypeError（name/status/id/count 字段）
- Object.isFrozen 检查
- JSON round-trip 深克隆独立性
- structuredClone 深克隆独立性和 Date 值保持

### 2. 安全注入防护 (12 用例)
- XSS script 标签存储为纯文本
- SQL 注入模式存储为纯文本
- 原型污染模式存储为纯文本
- 路径穿越模式存储为纯文本
- null 字节注入
- 大 Unicode 字符安全存储
- HTML 实体存储为纯文本
- javascript: 协议存储为纯文本
- LDAP 注入模式存储为纯文本
- CRLF 注入
- Unicode 欺骗字符
- CreateRequest/UpdateRequest 中的注入防护

### 3. 跨接口类型一致性 (6 用例)
- CreateRequest 字段是 KnowledgeBase 字段子集
- CreateRequest 省略 description 时 KB 中为 null
- UpdateRequest 局部更新保留未修改字段
- UpdateRequest empty 不改变任何字段
- CreateRequest 和 UpdateRequest scope 类型一致
- CreateRequest 和 UpdateRequest company_id 类型一致

### 4. 边界值补充 (17 用例)
- created_by: 0 / MAX_SAFE_INTEGER / 负数
- company_id / project_id: MAX_SAFE_INTEGER
- created_at / updated_at: epoch / 远未来日期
- count 字段: MAX_SAFE_INTEGER / 负数
- name: 单字符 / 纯空格
- description / company_name / project_name / creator_name: 极长文本
- 日期毫秒精度

### 5. JSON reviver Date 恢复 (4 用例)
- JSON.parse reviver 恢复 created_at / updated_at 为 Date
- reviver 保持非 Date 字段不变
- reviver 处理 null 保持 null
- reviver 后字段数量不变

### 6. 实际业务场景模拟 (9 用例)
- 系统管理员创建平台级知识库
- 公司管理员创建公司级知识库
- 创建项目级知识库
- 知识库添加内容后 count 累加更新
- 禁用知识库（status → false）
- 重新启用知识库
- 知识库从公司级升级到项目级
- 知识库列表分页查询
- 按 scope 分组统计

### 7. re-export async import 验证 (3 用例)
- KnowledgeBase 是 interface 非 runtime value
- CreateKnowledgeBaseRequest 是 interface 非 runtime value
- UpdateKnowledgeBaseRequest 是 interface 非 runtime value

### 8. CreateRequest/UpdateRequest 边界补充 (9 用例)
- undefined 可选字段不包含在 Object.keys
- 全字段设置时字段数验证
- description 设空字符串清空
- name 换行符支持
- scope 变更保留其他字段

## 注意事项

- `structuredClone` 在 Jest 环境中克隆的 Date 对象不通过 `toBeInstanceOf(Date)`（跨 realm 问题），改用 `typeof obj.getTime === 'function'` 检查
- 纯 interface 文件的覆盖率工具报告 0%，实际覆盖通过编译时类型检查 + 运行时断言双重保证
