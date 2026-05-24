# publishing-platform.controller.ts TDD 补全

## 日期
2026-05-24

## 变更文件
- `tests/apis/publishing-platform.controller.test.ts` — 新增 12 个边界值测试用例
- `tasks/tdd/publishing-platform.controller.test.md` — TDD 报告更新

## 变更摘要
原有 40 个测试已实现 100% 覆盖率，本次新增 12 个边界值和健壮性测试用例：

### 新增测试用例
1. 负数 pageSize（-5）→ 默认为 10
2. page=0 → 默认为 1
3. 小数 page（2.7）→ parseInt 截断为 2
4. 小数 pageSize（5.9）→ parseInt 截断为 5
5. pageSize=100 恰好等于 MAX_PAGE_SIZE → 通过
6. pageSize=1 最小有效值 → 通过
7. 空字符串 search 不触发长度校验错误
8. 分页 list 非 Error 对象抛出 → 500 + 默认消息
9. 分页列表返回多条记录验证
10. search + taxonomy 无 page/pageSize → 默认分页
11. search + 无效 sortBy 即使无 page 也返回 400
12. taxonomy + 无效 sortOrder 即使无 page 也返回 400

## 测试结果
- 52 个测试全部通过
- Stmts/Branch/Funcs/Lines: 100%

## 测试覆盖的边界值矩阵
| 参数 | 边界值 | 预期 |
|------|--------|------|
| page | NaN/-1/0/小数 | 默认 1 |
| pageSize | NaN/-5/0/小数/1/100/101+ | 默认 10 或截断至 100 |
| search | 空/100字符/101字符 | 通过/通过/400 |
| sortBy | 5种合法/非法 | 200/400 |
| sortOrder | asc/desc/非法 | 200/400 |
