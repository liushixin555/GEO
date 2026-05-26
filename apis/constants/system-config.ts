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

export function maskSensitiveValue(key: string, value: string): string {
  if (SENSITIVE_CONFIG_KEYS.has(key)) {
    return value.length > 2 ? `${value.slice(0, 2)}****` : '****';
  }
  return value;
}
