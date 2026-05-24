const VALID_ROLES = ['sysadmin', 'admin', 'view'] as const;
export type SafeUserRole = typeof VALID_ROLES[number];

export interface SafeUser {
  id: number;
  role: SafeUserRole;
  username?: string;
}

const DEFAULT_USER: SafeUser = { id: 0, role: 'view' };

export function getSafeUser(): SafeUser {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return { ...DEFAULT_USER };
    const parsed = JSON.parse(raw);
    return {
      id: typeof parsed.id === 'number' ? parsed.id : 0,
      role: VALID_ROLES.includes(parsed.role) ? parsed.role : 'view',
      username: typeof parsed.username === 'string' ? parsed.username : undefined,
    };
  } catch {
    return { ...DEFAULT_USER };
  }
}
