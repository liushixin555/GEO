# entity/errors.ts TDD 测试报告

**文件**: `apis/entity/errors.ts`
**测试文件**: `tests/apis/entity/errors.test.ts`
**日期**: 2026-05-25

## 源文件概况

`apis/entity/errors.ts` 定义了 3 个实体级错误类，均直接继承自 `Error`：

| 类名 | statusCode | 构造参数 | message 格式 |
|------|-----------|---------|-------------|
| `NotFoundError` | 404 | `entity: string` | `${entity}不存在` |
| `ConflictError` | 409 | `message: string` | 原样保留 |
| `BusinessError` | 400 | `message: string` | 原样保留 |

## 测试覆盖率

```
-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------|---------|----------|---------|---------|-------------------
errors.ts  |     100 |      100 |     100 |     100 |
-----------|---------|----------|---------|---------|-------------------
```

**四维覆盖率 100%**：Stmts 100% / Branch 100% / Funcs 100% / Lines 100%

## 测试统计

- **总用例数**: 124
- **通过**: 124
- **失败**: 0
- **耗时**: ~3.3s

## 测试维度

### NotFoundError（43 用例）
1. **构造函数与基本属性**（9）: statusCode、message 拼接、name、不同实体名、空字符串、长名称、特殊字符、空白字符、Unicode
2. **继承与原型链**（5）: instanceof Error、instanceof NotFoundError、非其他子类、原型链三层、constructor 指向
3. **throw/catch 行为**（4）: throw+catch、catch 中读取属性、instanceof 区分、异步 throw
4. **stack 属性**（3）: 存在性、包含名称、实例独立性
5. **JSON 序列化**（3）: statusCode 保留、message 不可枚举、name 保留
6. **属性描述符**（3）: statusCode 自身属性、描述符完整、name 自身属性
7. **不可变性**（2）: Object.freeze statusCode、Object.freeze message
8. **多实例独立性**（2）: 互不影响、相同参数不等
9. **解构**（1）: 完整解构
10. **函数参数传递**（1）: 作为 Error 参数
11. **集合操作**（3）: Array 过滤、Map 查找、Set 独立
12. **边界值**（4）: 纯数字、纯空格、换行符、超长 10000 字符

### ConflictError（34 用例）
1. **构造函数与基本属性**（7）: statusCode、message 保留、name、空字符串、中文长 message、HTML 标签、特殊字符
2. **继承与原型链**（5）: 同 NotFoundError 模式
3. **throw/catch 行为**（4）: 同 NotFoundError 模式
4. **stack 属性**（2）
5. **JSON 序列化**（2）
6. **属性描述符**（2）
7. **不可变性**（2）
8. **多实例独立性**（2）
9. **解构**（1）
10. **函数参数传递**（1）
11. **集合操作**（1）
12. **边界值**（3）: 超长、换行符、纯空格

### BusinessError（32 用例）
1. **构造函数与基本属性**（6）
2. **继承与原型链**（5）
3. **throw/catch 行为**（4）
4. **stack 属性**（2）
5. **JSON 序列化**（2）
6. **属性描述符**（2）
7. **不可变性**（2）
8. **多实例独立性**（2）
9. **解构**（1）
10. **函数参数传递**（1）
11. **集合操作**（1）
12. **边界值**（3）

### 跨类型综合测试（17 用例）
- 所有类均为 Error 实例
- instanceof 互不混淆
- statusCode 唯一性
- 4xx 范围验证
- stack 属性统一性
- JSON 序列化统一性
- 连续 throw/catch 链
- 数组分类
- Map 存储
- 统一错误处理函数
- name 与构造函数名对应
- Object.freeze 统一不可变
- 深拷贝独立性
- 嵌套 try-catch
- 结构相等性
- Promise.allSettled 混合
- 循环错误计数

### 实际使用场景（4 用例）
- Express 中间件错误处理模式
- Service → Controller 层错误传播
- 事务回滚场景
- 批量操作部分失败
