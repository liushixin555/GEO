# 2026-06-24 发布渠道列表翻页修复

## 问题现象

在新建发布计划页面的发布渠道列表中：

1. 发布渠道可以正常显示。
2. 可以通过分类筛选。
3. 可以通过输入关键词检索。
4. 但点击分页时无法正常翻页，页面会停留或回到第 1 页。

## 原因定位

问题位于前端页面：

```text
pages/publish/CreatePublishSchedule.tsx
```

发布渠道表格使用 Ant Design `Table`，同时配置了：

```tsx
pagination={{
  current: platformPage,
  pageSize: 10,
  total: platformTotal,
  onChange: (p) => setPlatformPage(p),
}}
```

以及 Table 顶层：

```tsx
onChange={(_pagination, _filters, sorter) => {
  // 排序处理
  setPlatformPage(1);
}}
```

Ant Design Table 的顶层 `onChange` 不只在排序时触发，点击分页也会触发。原逻辑在任何 Table 变化后都执行 `setPlatformPage(1)`，导致点击第 2 页时：

1. 分页回调把 `platformPage` 设置为 2。
2. Table 顶层 `onChange` 又触发。
3. 顶层 `onChange` 无条件执行 `setPlatformPage(1)`。
4. 页面被拉回第 1 页。

后端发布渠道接口本身已经支持分页：

```text
GET /api/v1/publishing-platforms?page=1&pageSize=10
```

后端 `PublishingPlatformServiceImpl.list` 中已使用：

```ts
skip: (page - 1) * pageSize,
take: pageSize,
```

因此本次优先修复前端 Table 事件处理。

## 修改方式

修改文件：

```text
pages/publish/CreatePublishSchedule.tsx
```

调整点：

1. 移除 `pagination.onChange`，避免分页事件被处理两次。
2. 在 Table 顶层 `onChange` 中使用第四个参数 `extra.action` 区分动作来源。
3. 当 `extra.action === 'paginate'` 时，只更新当前页并直接返回。
4. 排序或清除排序时，才更新排序参数并重置到第 1 页。

修改后的关键逻辑：

```tsx
onChange={(
  pagination: TablePaginationConfig,
  _filters: Record<string, unknown>,
  sorter: SorterResult<PlatformItem> | SorterResult<PlatformItem>[],
  extra,
) => {
  if (extra.action === 'paginate') {
    setPlatformPage(pagination.current || 1);
    return;
  }

  const s = Array.isArray(sorter) ? sorter[0] : sorter;
  if (s.field && s.order) {
    setSortBy(s.field as string);
    setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
  } else {
    setSortBy(null);
    setSortOrder(null);
  }
  setPlatformPage(1);
}}
```

## 验证过程

执行静态校验：

```powershell
npm.cmd run lint
npx.cmd tsc -p tsconfig.page.json --noEmit
npm.cmd run build:page
```

结果：

```text
ESLint 校验通过
前端 TypeScript 校验通过
前端 Vite 构建通过
```

同时调用本地后端接口检查分页接口结构：

```text
GET /api/v1/publishing-platforms?page=1&pageSize=10
GET /api/v1/publishing-platforms?page=2&pageSize=10
```

接口返回分页结构正常：

```text
login      : ok
total      : 0
page1      : 1
page1Count : 0
page2      : 2
page2Count : 0
```

当前本地数据库中发布渠道总数为 0，因此无法用本地真实数据对比第 1 页和第 2 页内容差异。但后端分页结构正常，前端分页事件冲突已修复。

## 最终结论

发布渠道列表无法翻页的根因是前端 Table 分页事件被顶层 `onChange` 中的排序重置逻辑覆盖。

本次修复后：

1. 点击分页会正常更新 `platformPage`。
2. 搜索关键词仍会重置到第 1 页。
3. 分类筛选仍会重置到第 1 页。
4. 排序或清除排序仍会重置到第 1 页。
5. 已选择的发布渠道仍通过 `selectedMapRef` 跨页保留。

同步或导入发布渠道数据后，可在新建发布计划页面继续进行真实数据翻页验证。

## 注意事项

本地接口验证时发布渠道总数为 0，这说明当前本地库尚未同步或导入发布渠道数据。若需要完整 UI 人工验收，需要先通过系统管理中的发布渠道同步功能，或导入包含发布渠道的数据。
