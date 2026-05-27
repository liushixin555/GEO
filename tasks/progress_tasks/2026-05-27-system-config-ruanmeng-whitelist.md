# fix063: 系统配置接口400——ruanmeng配置项未加入白名单

> 日期：2026-05-27
> 关联任务：dev013.系统配置

## 问题

调用 `PUT /api/v1/system-configs` 传入 `ruanmeng_username` / `ruanmeng_password` 返回 400：
```
{"code":400,"message":"参数验证失败: 包含不允许修改的配置项"}
```

## 原因

`apis/constants/system-config.ts` 中 `ALLOWED_CONFIG_KEYS` 白名单仅包含 `yishangshu_username` / `yishangshu_password`，Zod schema 校验 `z.enum(ALLOWED_CONFIG_KEYS)` 直接拒绝不在白名单中的 key。

## 修复

| 文件 | 变更 |
|------|------|
| `apis/constants/system-config.ts` | `ALLOWED_CONFIG_KEYS` 新增 `ruanmeng_username`, `ruanmeng_password` |
| `apis/constants/system-config.ts` | `SENSITIVE_CONFIG_KEYS` 新增 `ruanmeng_password` |

## 验证

- `tsc --noEmit -p tsconfig.api.json` 通过
- `eslint` 通过
