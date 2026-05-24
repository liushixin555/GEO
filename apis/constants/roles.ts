/**
 * 角色常量 — 避免在路由中硬编码角色字符串
 */
export const ROLES = {
  SYSADMIN: 'sysadmin',
  ADMIN: 'admin',
  VIEW: 'view',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
