# 自动发布第一版修复：收藏接口兼容与测试防真实发布

## 问题

测试发布平台收藏时前端提示“接口不存在”。同时自动发布第一版如果选择“尽快执行”，可能被发布计划定时器识别为到期计划，从而触发真实软盟发布，存在测试阶段产生费用的风险。

## 修复内容

- 发布平台收藏接口保留 `PUT /api/v1/publishing-platforms/:id/favorite`。
- 新增兼容接口 `POST /api/v1/publishing-platforms/:id/favorite`。
- 前端收藏按钮改为调用 `POST`，降低代理或方法限制导致 404 的概率。
- 自动发布第一版移除“尽快执行”选项。
- 自动发布弹窗默认设置为“此时间之后执行”，时间为明天同一时间。
- 后端自动发布接口拒绝 `asap`，避免测试阶段创建立即到期的发布计划。

## 验证

- `tsc --noEmit --project tsconfig.api.json` 通过。
- `tsc --noEmit --project tsconfig.page.json` 通过。
- `npm.cmd run lint` 通过。
- 静态检查 Express 路由表确认存在：
  - `POST /api/v1/publishing-platforms/:id/favorite`
  - `PUT /api/v1/publishing-platforms/:id/favorite`
  - `POST /api/v1/publishing-schedule/auto`

## 注意

如果浏览器仍提示“接口不存在”，优先检查后端是否已经重启。前端热更新不会让 Express 加载新增路由，必须停止并重新执行 `npm.cmd run dev`。
