# service/index.ts barrel 文件 TDD

## 变更摘要
为 `apis/service/index.ts` barrel 文件创建全面 TDD 测试覆盖。

## 测试文件
- `tests/apis/service/index.test.ts`

## 测试结果
- **72 用例全部通过**
- **覆盖率：Stmts/Branch/Funcs/Lines 全 100%**

## 测试覆盖范围
1. 导出数量验证（10 个运行时导出 + __esModule CJS 标记）
2. 导出存在性与类型验证（8 实现类 + 2 工厂函数）
3. 无意外导出验证
4. 实现类实例化验证
5. 工厂函数行为（createUserService/createLlmModelService）
6. 源模块关联验证（同一引用）
7. 重导入一致性
8. 导出唯一性
9. 接口方法存在性验证（8 服务 45 方法）
10. 异步函数验证
11. 模块结构汇总
12. 工厂函数与直接实例化一致性
13. 接口方法参数数量验证

## Mock 依赖
- `apis/utils/db.util` — getPrisma, closePrisma
- `bcryptjs` — hash, compare
- `jsonwebtoken` — sign, verify
- `apis/utils/rmapi.utils` — getRmToken, getAllRmResources
