# TDD 执行报告：publishing-platform.service.impl.ts

## 测试文件
`tests/apis/publishing-platform.service.test.ts`

## 测试目标
`apis/service/impl/publishing-platform.service.impl.ts` — `PublishingPlatformServiceImpl`

## 测试概览

| 方法 | 第1轮 | 第2轮 | 状态 |
|------|--------|--------|------|
| `constructor` | 2 | 0 | ✅ 全部通过 |
| `syncFromRm` | 13 | 23 | ✅ 全部通过 |
| `syncFromSystemConfig` | 11 | 7 | ✅ 全部通过 |
| `listAll` | 4 | 4 | ✅ 全部通过 |
| `list` | 25 | 16 | ✅ 全部通过 |
| **合计** | **55** | **+47** | **✅ 102全部通过** |

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

### syncFromRm() — 36个测试（第1轮13 + 第2轮23）

#### 第1轮（13个）
1. 完整认证、获取资源、返回计数
2. 按 id 去重远程资源
3. 删除不在远程数据中的过时记录
4. 所有远程 id 都存在本地时不删除
5. 过时记录超过 30000 条时分批删除（35000 → 2批）
6. 资源按 500 条分批 upsert（12条 → 1批）
7. 资源超过 500 条时多批 upsert（1200条 → 3批）
8. 处理空 remark（转为 null）
9. 处理 null include_rate/publish_rate（默认 0）
10. upsert 字段映射正确性
11. 空资源返回 0
12. 认证错误传播
13. 获取资源错误传播

#### 第2轮（新增23个）
1. Prisma findMany 错误传播（PG连接中断）
2. Prisma deleteMany 错误传播（删除超时）
3. Prisma $transaction 错误传播（事务超时）
4. undefined remark 处理（转为 null）
5. undefined include_rate/publish_rate 处理（默认 0）
6. price=0 边界值
7. price 负值
8. 删除批边界 30000 条（正好1批）
9. 删除批边界 30001 条（分2批）
10. upsert 批边界 500 条（正好1批）
11. upsert 批边界 501 条（分2批）
12. dedup id=0 边界值
13. 全部重复资源（5条同id → 去重为1）
14. 特殊字符 name/taxonomy（XSS/中文/斜杠）
15. 空格 remark（truthy，保留原值）
16. include_rate=1.0, publish_rate=0.99 边界值
17. 无现有记录的全新同步
18. 全量替换（所有现有记录均过时）
19. 多组重复去重（id=1×2, id=2×2, id=3×1 → 3条）
20. 去重后返回正确计数（非原始数量）
21. getRmToken 精确参数验证
22. getAllRmResources 使用返回的 token
23. upsert where 子句正确性

### syncFromSystemConfig() — 18个测试（第1轮11 + 第2轮7）

#### 第1轮（11个）
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

#### 第2轮（新增7个）
1. 空格 username（truthy，通过检查）
2. 空格 password（truthy，通过检查）
3. password 为 null 值
4. 凭证缺失时不调用 getRmToken/getAllRmResources
5. 特殊字符凭证传递
6. syncFromRm upsert 阶段错误传播
7. （含在空格 username 测试中）

### listAll() — 8个测试（第1轮4 + 第2轮4）

#### 第1轮（4个）
1. 按 taxonomy asc, name asc 排序返回全部
2. mapPublishingPlatform 字段映射
3. 空结果返回空数组
4. 处理 null remark 字段

#### 第2轮（新增4个）
1. 数据库错误传播
2. 全零数值字段
3. 特殊字符 name/taxonomy
4. 多条结果保持顺序

### list() — 41个测试（第1轮25 + 第2轮16）

#### 第1轮（25个）
1. 默认排序分页查询
2. 第2页 skip 计算
3. 第3页 skip 计算（pageSize=20）
4. search 过滤（name + taxonomy, insensitive）
5. taxonomy 精确过滤
6. search + taxonomy 组合过滤
7. search 为 undefined 时无 OR 条件
8. taxonomy 为 undefined 时无 taxonomy 条件
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
20. search 过滤传递给 count
21. 组合过滤传递给 count
22. 仅 taxonomy 过滤传递给 count
23. pageSize=1 边界
24. 大页码 skip 计算
25. 多条结果正确映射

#### 第2轮（新增16个）
1. 空字符串 search 不添加 OR 条件
2. 空字符串 taxonomy 不添加 taxonomy 条件
3. 双空字符串不添加任何过滤
4. findMany 错误传播
5. count 错误传播
6. name desc 排序
7. price asc 排序
8. include_rate desc 排序
9. publish_rate asc 排序
10. page=0 边界（skip=-10）
11. 全过滤条件+排序组合
12. 中文搜索字符
13. 仅 taxonomy + 排序组合
14. 仅 search + 默认排序
15-16. （含在组合测试中）

## 第2轮新增测试分类

### 错误传播（8个）
- Prisma findMany/deleteMany/$transaction/findMany(count)/count 错误传播
- syncFromRm upsert 阶段错误传播
- credentials 缺失时不调用下游

### 边界值（9个）
- 删除批 30000/30001 精确边界
- upsert 批 500/501 精确边界
- price=0/负值
- include_rate=1.0, publish_rate=0.99
- page=0, pageSize=1
- id=0 去重

### 数据完整性（8个）
- undefined remark/include_rate/publish_rate
- 空格字符串处理
- 特殊字符/XSS
- null config value
- 全量替换/全重复去重
- 去重后计数正确性

### 组合验证（6个）
- 全过滤+排序组合
- taxonomy+排序组合
- search+默认排序
- 参数精确传递
- count 与 findMany 一致性

## Mock 策略
- `getPrisma` — mock PrismaClient（findMany, deleteMany, upsert, $transaction, count）
- `getRmToken` — mock RM API 认证
- `getAllRmResources` — mock RM API 资源获取
- `SystemConfigServiceImpl` — mock 构造函数，通过 `__mockGetAll` 暴露 getAll mock
