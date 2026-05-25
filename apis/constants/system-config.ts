/**
 * 系统配置常量 — 白名单与敏感键统一定义，单一来源
 */

export const ALLOWED_CONFIG_KEYS = [
  'yishangshu_username',
  'yishangshu_password',
] as const;

export type AllowedConfigKey = (typeof ALLOWED_CONFIG_KEYS)[number];

export const SENSITIVE_CONFIG_KEYS: Set<string> = new Set([
  'yishangshu_password',
]);
