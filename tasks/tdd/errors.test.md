# errors.ts TDD 执行报告

## 测试目标文件
- `apis/errors.ts` — 统一异常类层次结构

## 测试文件
- `tests/apis/errors.test.ts`

## 测试结果
- **总用例数**: 97
- **通过**: 97
- **失败**: 0
- **覆盖率**: 100%（Statements / Branch / Functions / Lines）

## 测试分类明细

### 1. AppError 基类（10 用例）
| 用例 | 说明 |
|------|------|
| 应正确创建带 statusCode 和 message 的实例 | 构造函数参数传递 |
| 应为 Error 的实例 | 继承链验证 |
| 应为 AppError 的实例 | 自引用验证 |
| name 属性应为构造函数名 | name = constructor.name |
| 原型链应正确设置（new.target.prototype） | Object.setPrototypeOf 验证 |
| stack 属性应存在且为字符串 | Error 标准行为 |
| statusCode 应为只读属性 | readonly 编译约束 |
| 空 message 应被接受 | 边界值 |
| JSON.stringify 应包含 statusCode | 序列化 |
| 不同 AppError 实例应互不影响 | 实例隔离 |

### 2. NotFoundError（12 用例）
| 用例 | 说明 |
|------|------|
| 应正确设置 statusCode 为 404 | HTTP 状态码 |
| 应正确拼接 message | `${entity}不存在` 模板 |
| 不同实体名应产生不同 message | 参数化构造 |
| 应为 Error 的实例 | 三层继承验证 |
| 应为 AppError 的实例 | 中间层继承 |
| 应为 NotFoundError 的实例 | 自身类型 |
| name 应为 NotFoundError | 构造函数名 |
| 原型链应正确（三层继承） | prototype chain |
| 可以用 catch 捕获 | throw/catch |
| catch 中 instanceof 应能区分类型 | 多态区分 |
| stack 应包含抛出位置信息 | 调试信息 |
| 空实体名应生成 "不存在" message | 边界值 |

### 3. BusinessError（10 用例）
| 用例 | 说明 |
|------|------|
| 应正确设置 statusCode 为 400 | HTTP 状态码 |
| 应保留自定义 message | 参数传递 |
| 应为 Error/AppError/BusinessError 的实例 | 继承链 |
| name 应为 BusinessError | 构造函数名 |
| 原型链应正确 | prototype chain |
| 可以用 catch 捕获 | throw/catch |
| catch 中 instanceof 应能区分类型 | 多态区分 |
| 中文 message 应正确存储 | Unicode |
| 空 message 应被接受 | 边界值 |

### 4. UnauthorizedError（8 用例）
| 用例 | 说明 |
|------|------|
| 应正确设置 statusCode 为 401 | HTTP 状态码 |
| 不传参时使用默认 message | 默认参数值 |
| 自定义 message 应覆盖默认值 | 参数覆盖 |
| 应为 Error/AppError/UnauthorizedError 的实例 | 继承链 |
| name 应为 UnauthorizedError | 构造函数名 |
| 原型链应正确 | prototype chain |
| 可以用 catch 捕获 | throw/catch |
| catch 中 instanceof 应能区分类型 | 多态区分 |

### 5. ForbiddenError（8 用例）
| 用例 | 说明 |
|------|------|
| 应正确设置 statusCode 为 403 | HTTP 状态码 |
| 不传参时使用默认 message | 默认参数值 |
| 自定义 message 应覆盖默认值 | 参数覆盖 |
| 应为 Error/AppError/ForbiddenError 的实例 | 继承链 |
| name 应为 ForbiddenError | 构造函数名 |
| 原型链应正确 | prototype chain |
| 可以用 catch 捕获 | throw/catch |
| catch 中 instanceof 应能区分与 UnauthorizedError | 近似类型区分 |

### 6. ConflictError（9 用例）
| 用例 | 说明 |
|------|------|
| 应正确设置 statusCode 为 409 | HTTP 状态码 |
| 应保留自定义 message | 参数传递 |
| 应为 Error/AppError/ConflictError 的实例 | 继承链 |
| name 应为 ConflictError | 构造函数名 |
| 原型链应正确 | prototype chain |
| 可以用 catch 捕获 | throw/catch |
| catch 中 instanceof 应能区分类型 | 多态区分 |
| 中文 message 应正确存储 | Unicode |

### 7. 跨类型综合测试（9 用例）
| 用例 | 说明 |
|------|------|
| 所有子类实例都应是 AppError 实例 | 统一基类 |
| 所有子类实例都应是 Error 实例 | 根基类 |
| 每个子类的 name 应对应其构造函数名 | 反射一致性 |
| 各子类之间 instanceof 应互不混淆 | 类型安全 |
| statusCode 在各类中应唯一且符合 HTTP 规范 | 400-499 范围 |
| 所有错误都应有 stack 属性 | 调试能力 |
| 所有错误应可序列化为 JSON 并保留 statusCode | 序列化 |
| catch 中可以按 AppError 统一处理所有子类 | 统一异常处理 |
| AppError 自身不应为任何子类的实例 | 方向性 |

### 8. JSON 序列化往返（6 用例）
| 用例 | 说明 |
|------|------|
| NotFoundError 序列化后应保留 statusCode | JSON 往返 |
| BusinessError 序列化后应保留 statusCode | JSON 往返 |
| UnauthorizedError 序列化后应保留 statusCode | JSON 往返 |
| ForbiddenError 序列化后应保留 statusCode | JSON 往返 |
| ConflictError 序列化后应保留 statusCode | JSON 往返 |
| Error.message 不可枚举，序列化后为 undefined | JS 原生特性 |

### 9. Object.freeze 不可变（5 用例）
五种错误类型冻结后修改属性均抛出 TypeError。

### 10. 结构相等性（4 用例）
相同参数构造的不同实例属性值应完全一致。

### 11. 深拷贝（3 用例）
JSON 序列化深拷贝应保留 statusCode，修改拷贝不影响原始对象。

### 12. 解构模式（3 用例）
验证 statusCode、message、name、stack 均可正确解构。

### 13. 集合高级操作（3 用例）
数组过滤、Map 查找、Set 去重。

### 14. 连续更新链（1 用例）
连续抛出并捕获不同类型错误，验证 statusCode 序列。

### 15. 属性描述符（3 用例）
验证 statusCode 的 writable/enumerable/configurable 描述符。

### 16. 函数参数传递（5 用例）
五种错误类型作为函数参数传递后正确返回 status + body。

## 踩坑记录
1. **Error.message 不可枚举** — `JSON.stringify(new Error('x'))` 不会包含 `message` 字段，这是 JavaScript 原生行为，测试需区别对待
2. **hasOwnProperty 短路问题** — `err.hasOwnProperty('name') || err.name` 中前者返回 `true` 导致断言失败，需拆分为两个独立 expect
