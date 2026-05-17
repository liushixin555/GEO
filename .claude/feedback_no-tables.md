---
name: no-tables-use-cards
description: 所有页面禁止使用表格(Table)，只能使用卡片(Card)布局展示数据
metadata:
  type: feedback
---

所有页面禁止使用 antd Table 组件，只能使用 Card 卡片布局展示数据列表。

**Why:** 用户明确要求所有页面统一使用卡片展示，不使用表格。

**How to apply:** 任何需要展示数据列表的场景，使用 Row + Col + Card 网格布局（参照 sysadmin 页面和 user/skills 页面的 item-card 模式），配合 Pagination 分页。禁止引入 antd Table 或原生 `<table>` 元素。
