# 2026-07-01 检测台账前端可视化增强

## 范围

- 仅调整 `/citation-diagnosis` 前端页面，不修改后端业务逻辑。
- 使用现有 `GET /api/v1/citation-diagnosis/ledger` 台账列表、`GET /api/v1/citation-diagnosis/ledger/:articleId/details` 台账详情、`POST /api/v1/citation-diagnosis/run-auto` 手动复检接口。

## 变更

- 台账列表新增当前页概览：已引用文章数、命中次数、待补发布链接数。
- 列表显式展示发布链接、引用模型、命中次数，降低非技术人员理解成本。
- 详情抽屉接入详情接口，展示发布链接、引用模型、检测问题、AI 回答、引用来源和命中片段。
- 详情接口不可用或无详情数据时，保留详情区域并展示“暂无检测详情”，不阻塞列表功能。
- 页面继续使用 Ant Design 组件，时间显示继续走 `pages/utils/date.ts`。

## 验证

- `npm.cmd run lint` 通过。
- `npm.cmd run build:page` 通过。
- 未执行 `pnpm test`。
- 未执行推送。
