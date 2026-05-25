# errors.ts TDD 执行报告

## 测试目标文件
- `apis/errors.ts` — 统一异常类层次结构

## 测试文件
- `tests/apis/errors.test.ts`

## 测试结果
- **总用例数**: 157
- **通过**: 157
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

### 17. 安全注入（16 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| message 含 HTML 标签不应被转义 | XSS 防护 |
| message 含 SQL 注入字符串应原样保留 | SQL 注入 |
| message 含 null 字节应保留 | 空字节注入 |
| message 含换行符应保留 | CRLF 注入 |
| message 含 Unicode 特殊字符应保留 | Unicode 攻击 |
| message 含超长字符串不应截断 | 缓冲区溢出 |
| NotFoundError entity 含 HTML 注入应原样保留 | XSS via entity |
| ConflictError message 含模板语法应原样保留 | 模板注入 |
| UnauthorizedError 自定义 message 含注入应原样保留 | SQL via auth |
| ForbiddenError 自定义 message 含路径遍历应原样保留 | 路径遍历 |
| prototype pollution 不应影响类层次 | 原型链污染 |
| 修改实例 __proto__ 不应影响类原型 | 原型篡改 |
| toString/valueOf 注入不应影响 statusCode | 对象注入 |
| AppError statusCode 传入非数字应正常赋值 | 类型混淆 |
| AppError message 传入非字符串应正常赋值 | 类型混淆 |
| 构造函数 new.target 始终指向直接调用者 | new.target 完整性 |

### 18. NaN / Infinity 边界（8 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| statusCode 为 NaN 应原样存储 | NaN 边界 |
| statusCode 为 Infinity 应原样存储 | 正无穷 |
| statusCode 为 -Infinity 应原样存储 | 负无穷 |
| statusCode 为 0 应正常存储 | 零值边界 |
| statusCode 为负数应正常存储 | 负数边界 |
| statusCode 为浮点数应正常存储 | 浮点数 |
| statusCode 为极大整数应正常存储 | MAX_SAFE_INTEGER |
| statusCode 为极小负整数应正常存储 | MIN_SAFE_INTEGER |

### 19. 类型守卫（10 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| AppError 实例通过类型守卫应返回 true | instanceof |
| NotFoundError 实例通过类型守卫应返回 true | 子类兼容 |
| BusinessError 实例通过类型守卫应返回 true | 子类兼容 |
| 普通 Error 通过类型守卫应返回 false | 非 AppError |
| null 通过类型守卫应返回 false | null 安全 |
| undefined 通过类型守卫应返回 false | undefined 安全 |
| 字符串通过类型守卫应返回 false | 类型拒绝 |
| 数字通过类型守卫应返回 false | 类型拒绝 |
| 普通对象通过类型守卫应返回 false | 伪造对象 |
| 类型守卫应正确窄化类型 | TypeScript 窄化 |

### 20. 深冻结（7 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| Object.freeze 后 AppError 属性不可写 | 冻结完整性 |
| Object.freeze 后 NotFoundError 属性不可写 | 冻结完整性 |
| Object.freeze 后 BusinessError 属性不可删除 | 删除防护 |
| Object.freeze 后 UnauthorizedError 不允许添加新属性 | 扩展防护 |
| Object.freeze 后 ForbiddenError 不允许修改 message | 修改防护 |
| Object.freeze 后 ConflictError configurable 为 false | 描述符验证 |
| Object.isFrozen 应返回 true | 冻结检测 |

### 21. 生命周期 / 原型链完整性（7 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| AppError.prototype 的原型应为 Error.prototype | 原型层级 |
| NotFoundError 三层原型链完整 | 全链验证 |
| BusinessError constructor 应指向自身 | 构造函数反射 |
| UnauthorizedError 原型链上不应有其他子类的方法 | 隔离性 |
| 多次创建实例不应共享状态 | 实例隔离 |
| 子类实例的 hasOwnProperty 应正确反映自身属性 | 属性归属 |
| 所有子类原型应共享 AppError.prototype 作为父原型 | 继承一致性 |

### 22. 业务场景（12 用例）— 第二轮新增
| 用例 | 说明 |
|------|------|
| Express 错误处理中间件应能统一捕获 AppError | 全局异常处理 |
| Express 错误处理中间件应将非 AppError 视为 500 | 降级处理 |
| 未登录用户访问受保护资源应抛出 UnauthorizedError | 认证场景 |
| 无权限用户操作应抛出 ForbiddenError | 授权场景 |
| 查询不存在的实体应抛出 NotFoundError | 查询场景 |
| 创建重复资源应抛出 ConflictError | 唯一性约束 |
| 业务校验失败应抛出 BusinessError | 校验场景 |
| async 函数中抛出 AppError 应可被 catch 捕获 | 异步场景 |
| Promise.reject 包裹 AppError 应可被 catch 捕获 | Promise 场景 |
| 嵌套 try-catch 应正确传递错误 | 错误转换 |
| 错误映射表应能根据 statusCode 查找错误类型 | 反向映射 |
| 错误应可正确传递给客户端响应 | API 响应 |

## 第二轮补全统计
- **新增用例**: 60（安全注入16 + NaN边界8 + 类型守卫10 + 深冻结7 + 生命周期7 + 业务场景12）
- **总用例**: 97 + 60 = 157
- **覆盖率**: 100% Stmts / 100% Branch / 100% Funcs / 100% Lines

## 踩坑记录
1. **Error.message 不可枚举** — `JSON.stringify(new Error('x'))` 不会包含 `message` 字段，这是 JavaScript 原生行为，测试需区别对待
2. **hasOwnProperty 短路问题** — `err.hasOwnProperty('name') || err.name` 中前者返回 `true` 导致断言失败，需拆分为两个独立 expect
3. **toString/valueOf 注入测试** — 传入带 toString 的对象给 NotFoundError 时，模板字符串会调用 toString()，验证 message 结果符合 JS 运行时行为
