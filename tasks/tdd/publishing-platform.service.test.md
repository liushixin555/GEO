# TDD 执行报告：publishing-platform.service.impl.ts

## 测试文件
`tests/apis/publishing-platform.service.test.ts`

## 测试目标
`apis/service/impl/publishing-platform.service.impl.ts` — `PublishingPlatformServiceImpl`

## 测试概览

| 方法 | 测试数 | 状态 |
|------|--------|------|
| `syncFromRm` | 13 | ✅ 全部通过 |
| `listAll` | 4 | ✅ 全部通过 |
| `list` | 25 | ✅ 全部通过 |
| `syncFromSystemConfig` | 11 | ✅ 全部通过 |
| `constructor` | 2 | ✅ 全部通过 |
| **合计** | **55** | **✅ 全部通过** |

## 覆盖率

```
File                                 | % Stmts | % Branch | % Funcs | % Lines
-------------------------------------|---------|----------|---------|--------
publishing-platform.service.impl.ts  |   100%  |   100%   |  100%   |  100%
```

## 测试场景详情

### constructor() — 2个测试
1. 创建 PublishingPlatformServiceImpl 实例
2. 正确创建 SystemConfigServiceImpl 依赖

### syncFromSystemConfig() — 11个测试（新增）
1. 使用系统配置的凭证同步平台
2. username 未配置时抛出错误
3. password 未配置时抛出错误
4. username 和 password 都缺失时抛出错误
5. 配置列表为空时抛出错误
6. 传播 systemConfigService.getAll 错误
7. 传播 syncFromRm 错误
8. 处理空字符串的 config value
9. 处理 username 非空但 password 为空字符串
10. 从多个配置中正确构建 config map
11. 重复 config key 时使用最后一个值

### syncFromRm() — 13个测试
1. 完整认证、获取资源、返回计数
2. 按 id 去重远程资源
3. 删除不在远程数据中的过时记录
4. 所有远程 id 都存在本地时不删除
5. 过时记录超过 30000 条时分批删除
6. 资源按 500 条分批 upsert
7. 资源超过 500 条时多批 upsert（1200条 → 3批）
8. 处理空 remark（转为 null）
9. 处理 null include_rate/publish_rate（默认 0）
10. upsert 字段映射正确性
11. 空资源返回 0
12. 认证错误传播
13. 获取资源错误传播

### listAll() — 4个测试
1. 按 taxonomy asc, name asc 排序返回全部
2. mapPublishingPlatform 字段映射
3. 空结果返回空数组
4. 处理 null remark 字段

### list() — 25个测试（原有 20 + 新增 5）
1. 默认排序分页查询
2. 第2页 skip 计算
3. 第3页 skip 计算（pageSize=20）
4. search 过滤（name + taxonomy, insensitive）
5. taxonomy 精确过滤
6. search + taxonomy 组合过滤
7. search 为空时无 OR 条件
8. taxonomy 为空时无 taxonomy 条件
9. 按 name asc 排序
10. 按 taxonomy desc 排序
11. 按 price desc 排序
12. 按 include_rate → includeRate 映射排序
13. 按 publish_rate → publishRate 映射排序
14. sortOrder 非 desc 默认 asc
15. 未识别 sortBy 回退默认排序
16. sortBy 为 undefined 回退默认排序
17. 返回 mapPublishingPlatform 映射结果
18. 空结果返回空列表
19. findMany 和 count 并行执行
20. count 使用相同 where 条件
21. 组合搜索+分类过滤同步传递给 count（新增）
22. 仅分类过滤同步传递给 count（新增）
23. pageSize=1 边界测试（新增）
24. 大页码 skip 计算正确（新增）
25. 多条结果正确映射（新增）

## 新增测试说明

本次在原有 37 个测试基础上新增 18 个测试：

1. **syncFromSystemConfig() 测试套件（11 个）**：原测试完全缺失此方法的覆盖，新增后实现 100% 分支覆盖，包括：
   - 正常同步流程
   - username/password 缺失的各种组合（4 种场景）
   - 空配置列表
   - 错误传播（getAll 和 syncFromRm）
   - 空字符串值处理
   - 多配置项和重复 key 处理

2. **list() 补充测试（5 个）**：增强了 count 过滤传递和边界值测试

3. **constructor 测试（2 个）**：验证实例化和依赖创建

## Mock 策略
- `getPrisma` — mock PrismaClient（findMany, deleteMany, upsert, $transaction, count）
- `getRmToken` — mock RM API 认证
- `getAllRmResources` — mock RM API 资源获取
- `SystemConfigServiceImpl` — mock 构造函数，通过 `__mockGetAll` 暴露 getAll mock
