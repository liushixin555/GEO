# KeywordDetail.tsx 评审修复 — 2026-05-26

## 修复范围
基于5份评审（安全4.6/10、架构3.5/10、质量3.8/10、UI 3.5/10、Committer 4.2/10），修复全部3项阻断 + 3项高优 + UI P1优化。

## P0 阻断修复
- **B-1**: Alert `title` → `message` prop（L70, L189）— 错误信息从不可见变为正常显示
- **B-2**: handleSave/handleExpand 改用 `form.validateFields()` 替代 `form.getFieldValue()` — Form 校验规则现在正确触发
- **B-3**: 消除3处 `any` 类型（L47, L123, L143），统一使用 `getApiErrorMessage(err, '保存失败')`

## P1 高优修复
- **H-1**: 空 catch `/* ignore */` → `console.warn('[KeywordDetail] fetchBaseName failed:', err)`
- **H-4**: 提取 `selectedCount = useMemo(...)` 消除4次重复 filter 计算
- fetchData useCallback 补全 `form` + `message` 依赖

## UI P1 修复
- Spin → Skeleton 骨架屏（更好的加载体验）
- 手动 Checkbox 列 → Table `rowSelection`（内置全选/反选）
- 手动分页 → Table 内置 pagination（含 showTotal）
- disabled 按钮包裹 Tooltip 提示原因
- 添加全选/取消全选按钮 + 已选计数
- Empty 空状态引导
- 8处 inline style → CSS class（keyword-detail-* 系列）
- 前端批量提交 500 上限校验（MAX_BATCH_SIZE）

## 变更文件
- `pages/knowledge/KeywordDetail.tsx` — 重写
- `pages/styles/global.css` — 添加 keyword-detail CSS 类

## 预期修复后评分
- 综合：7.0/10（Committer评审预估）
