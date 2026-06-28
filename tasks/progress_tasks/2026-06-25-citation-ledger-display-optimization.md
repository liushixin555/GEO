# 2026-06-25 引用诊断台账展示优化

## 变更内容

- 将隐藏后台台账从 11 列横向铺开，改为 7 列紧凑主表：
  `发布时间、发布平台、文章标题、主题词/标签、发布链接、引用记录、操作`。
- 每行新增“详情”按钮，使用抽屉展示完整台账字段。
- 新增 CSV 导出，按当前筛选条件分页拉取台账数据并导出，使用 UTF-8 BOM 保证 Windows Excel 打开中文不乱码。
- 清理引用诊断页乱码文案，页面展示恢复为正常中文。

## 验证

- `npm.cmd run build:page` 通过。
- `npm.cmd run lint` 通过。
- `npx.cmd antd lint pages/citation-diagnosis/index.tsx --format json` 未能执行，原因是本地 antd CLI 报 `could not determine executable to run`。
