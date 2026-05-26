export const ROLE_LABELS: Record<string, string> = {
  sysadmin: '系统管理员',
  admin: '运营者',
  view: '查看者',
} as const;

export const ROLE_COLORS: Record<string, string> = {
  sysadmin: 'blue',
  admin: 'default',
  view: 'default',
} as const;

export const ROLE_OPTIONS = [
  { value: 'sysadmin', label: '系统管理员' },
  { value: 'admin', label: '运营者' },
  { value: 'view', label: '查看者' },
] as const;
