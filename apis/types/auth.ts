import type { Role } from '../constants/roles';

/** 认证上下文 — 统一传递用户身份信息 */
export interface AuthContext {
  userId: number;
  role: Role;
}
