# 2026-05-25 system-config.controller.ts 安全评审 v2

## 变更摘要
- 对 `apis/controller/system-config.controller.ts` 进行代码安全专家评审（v2 复审）
- 输出文件: `tasks/review/system-config.controller.ts.md`

## 评审结论
- v1 的 7 项问题中 5 项已修复（CRITICAL 密码明文泄露已解决），但发现 2 项新 HIGH + 2 项新 MEDIUM
- **最严重问题**: PUT 接口响应明文回显 `yishangshu_password`（GET 已脱敏但 PUT 遗漏）
- **白名单双重定义**: Controller 和 Schema 各维护一份 `ALLOWED_CONFIG_KEYS`，存在漂移风险
- 安全评级: HIGH（修复 PUT 脱敏后可降至 MEDIUM）

## 新增/更新文件
- `tasks/review/system-config.controller.ts.md` — 安全评审报告 v2
