# 2026-06-30 EvidenceCard 后端 CRUD

## 变更范围

- 新增 EvidenceCard entity、schema、service、controller、routes。
- 挂载 `/api/v1/evidence-cards`。
- service barrel 导出 `createEvidenceCardService`。
- Prisma schema 补齐本地缺失的 `EvidenceCard` / `ArticleEvidenceCard` 最小模型，使 Prisma client 与 API build 可生成。

## 关键规则

- EvidenceCard 路由统一使用 `authMiddleware` 和 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)`。
- 删除接口为集合级 `DELETE /api/v1/evidence-cards`，请求体使用 `ids: number[]`，执行 `deletedAt` 软删除。
- keywords 在 Zod 层拒绝非数组/非字符串项，在 service 层再次规范为 `string[]` 后写库。

## 验证

- `pnpm build:api`：通过。
- `pnpm lint`：通过。
- 未执行 `pnpm test`。
