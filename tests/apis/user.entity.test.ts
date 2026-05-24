/**
 * @jest-environment node
 */
import {
  User,
  UserRole,
  LoginRequest,
  LoginResponse,
  SaveSelectionRequest,
  LoginSelectionError,
  PermissionDeniedError,
  UserListItem,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../apis/entity/user.entity';

describe('user.entity', () => {
  // ============================================================
  // UserRole type
  // ============================================================
  describe('UserRole type', () => {
    it('should accept sysadmin role', () => {
      const role: UserRole = 'sysadmin';
      expect(role).toBe('sysadmin');
    });

    it('should accept admin role', () => {
      const role: UserRole = 'admin';
      expect(role).toBe('admin');
    });

    it('should accept view role', () => {
      const role: UserRole = 'view';
      expect(role).toBe('view');
    });

    it('should contain exactly three valid values', () => {
      const roles: UserRole[] = ['sysadmin', 'admin', 'view'];
      expect(roles).toHaveLength(3);
      expect(roles).toEqual(expect.arrayContaining(['sysadmin', 'admin', 'view']));
    });
  });

  // ============================================================
  // User interface
  // ============================================================
  describe('User interface', () => {
    it('should create a valid User with all required fields', () => {
      const user: User = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashed_password',
        cn_name: '测试用户',
        role: 'admin',
        status: true,
        company_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(user.password_hash).toBe('hashed_password');
      expect(user.cn_name).toBe('测试用户');
      expect(user.role).toBe('admin');
      expect(user.status).toBe(true);
      expect(user.company_id).toBe(1);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should allow company_id to be null', () => {
      const user: User = {
        id: 2,
        username: 'sysadmin',
        password_hash: 'hash',
        cn_name: '系统管理员',
        role: 'sysadmin',
        status: true,
        company_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(user.company_id).toBeNull();
    });

    it('should allow company_id to be undefined', () => {
      const user: User = {
        id: 3,
        username: 'viewer',
        password_hash: 'hash',
        cn_name: '查看者',
        role: 'view',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(user.company_id).toBeUndefined();
    });

    it('should support sysadmin role', () => {
      const user: User = {
        id: 1, username: 'sa', password_hash: 'h', cn_name: 'SA',
        role: 'sysadmin', status: true, created_at: new Date(), updated_at: new Date(),
      };
      expect(user.role).toBe('sysadmin');
    });

    it('should support admin role', () => {
      const user: User = {
        id: 2, username: 'adm', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, created_at: new Date(), updated_at: new Date(),
      };
      expect(user.role).toBe('admin');
    });

    it('should support view role', () => {
      const user: User = {
        id: 3, username: 'vw', password_hash: 'h', cn_name: '查看者',
        role: 'view', status: false, created_at: new Date(), updated_at: new Date(),
      };
      expect(user.role).toBe('view');
    });

    it('should allow status to be false (disabled user)', () => {
      const user: User = {
        id: 4, username: 'disabled', password_hash: 'h', cn_name: '已禁用',
        role: 'view', status: false, created_at: new Date(), updated_at: new Date(),
      };
      expect(user.status).toBe(false);
    });

    it('should have exactly 9 fields', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: 'N',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(user)).toHaveLength(9);
    });

    it('should have correct field names', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: 'N',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(user)).toEqual([
        'id', 'username', 'password_hash', 'cn_name',
        'role', 'status', 'company_id', 'created_at', 'updated_at',
      ]);
    });

    it('should support numeric id values', () => {
      const user: User = {
        id: 99999, username: 'u', password_hash: 'h', cn_name: 'N',
        role: 'view', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.id).toBe(99999);
    });

    it('should support Chinese characters in cn_name', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: '张三李四',
        role: 'admin', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.cn_name).toBe('张三李四');
    });

    it('should support empty string for cn_name', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: '',
        role: 'view', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.cn_name).toBe('');
    });

    it('should support empty string for password_hash', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: '', cn_name: 'N',
        role: 'view', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.password_hash).toBe('');
    });

    it('should support id of 0', () => {
      const user: User = {
        id: 0, username: 'u', password_hash: 'h', cn_name: 'N',
        role: 'view', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.id).toBe(0);
    });
  });

  // ============================================================
  // LoginRequest interface
  // ============================================================
  describe('LoginRequest interface', () => {
    it('should create a valid LoginRequest', () => {
      const req: LoginRequest = {
        username: 'admin',
        password: 'password123',
      };
      expect(req.username).toBe('admin');
      expect(req.password).toBe('password123');
    });

    it('should have exactly username and password fields', () => {
      const req: LoginRequest = { username: 'test', password: 'test' };
      expect(Object.keys(req)).toEqual(['username', 'password']);
    });

    it('should support empty username', () => {
      const req: LoginRequest = { username: '', password: 'pass' };
      expect(req.username).toBe('');
    });

    it('should support empty password', () => {
      const req: LoginRequest = { username: 'user', password: '' };
      expect(req.password).toBe('');
    });

    it('should have 2 fields', () => {
      const req: LoginRequest = { username: 'a', password: 'b' };
      expect(Object.keys(req)).toHaveLength(2);
    });
  });

  // ============================================================
  // LoginResponse interface
  // ============================================================
  describe('LoginResponse interface', () => {
    it('should create a valid LoginResponse with all nested fields', () => {
      const res: LoginResponse = {
        token: 'jwt_token_string',
        user: {
          id: 1,
          username: 'admin',
          cn_name: '管理员',
          role: 'admin',
          company_id: 1,
          selected_company: { id: 1, short_name: 'ACME' },
          selected_project: { id: 2, short_name: '项目A' },
        },
      };
      expect(res.token).toBe('jwt_token_string');
      expect(res.user.id).toBe(1);
      expect(res.user.role).toBe('admin');
      expect(res.user.selected_company).toEqual({ id: 1, short_name: 'ACME' });
      expect(res.user.selected_project).toEqual({ id: 2, short_name: '项目A' });
    });

    it('should allow selected_company and selected_project to be null', () => {
      const res: LoginResponse = {
        token: 'token',
        user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          company_id: null, selected_company: null, selected_project: null,
        },
      };
      expect(res.user.selected_company).toBeNull();
      expect(res.user.selected_project).toBeNull();
    });

    it('should allow company_id to be undefined', () => {
      const res: LoginResponse = {
        token: 'token',
        user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          selected_company: null, selected_project: null,
        },
      };
      expect(res.user.company_id).toBeUndefined();
    });

    it('should have token field at top level', () => {
      const res: LoginResponse = {
        token: 'abc',
        user: {
          id: 1, username: 'u', cn_name: 'N', role: 'admin',
          selected_company: null, selected_project: null,
        },
      };
      expect(Object.keys(res)).toContain('token');
      expect(Object.keys(res)).toContain('user');
      expect(Object.keys(res)).toHaveLength(2);
    });

    it('should have correct user nested object fields', () => {
      const res: LoginResponse = {
        token: 't',
        user: {
          id: 1, username: 'u', cn_name: 'N', role: 'admin',
          company_id: 1,
          selected_company: { id: 1, short_name: 'C' },
          selected_project: { id: 2, short_name: 'P' },
        },
      };
      const userKeys = Object.keys(res.user);
      expect(userKeys).toEqual([
        'id', 'username', 'cn_name', 'role',
        'company_id', 'selected_company', 'selected_project',
      ]);
    });

    it('should support selected_company without selected_project', () => {
      const res: LoginResponse = {
        token: 't',
        user: {
          id: 1, username: 'u', cn_name: 'N', role: 'admin',
          company_id: 1,
          selected_company: { id: 1, short_name: 'C' },
          selected_project: null,
        },
      };
      expect(res.user.selected_company).toEqual({ id: 1, short_name: 'C' });
      expect(res.user.selected_project).toBeNull();
    });

    it('should support selected_project without selected_company', () => {
      const res: LoginResponse = {
        token: 't',
        user: {
          id: 1, username: 'u', cn_name: 'N', role: 'admin',
          company_id: 1,
          selected_company: null,
          selected_project: { id: 3, short_name: 'Proj' },
        },
      };
      expect(res.user.selected_company).toBeNull();
      expect(res.user.selected_project).toEqual({ id: 3, short_name: 'Proj' });
    });

    it('should support sysadmin role in response', () => {
      const res: LoginResponse = {
        token: 't',
        user: {
          id: 1, username: 'sa', cn_name: 'SA', role: 'sysadmin',
          company_id: null, selected_company: null, selected_project: null,
        },
      };
      expect(res.user.role).toBe('sysadmin');
    });

    it('should support view role in response', () => {
      const res: LoginResponse = {
        token: 't',
        user: {
          id: 2, username: 'v', cn_name: 'V', role: 'view',
          company_id: 5, selected_company: { id: 5, short_name: 'Co' }, selected_project: null,
        },
      };
      expect(res.user.role).toBe('view');
    });

    it('should support empty token string', () => {
      const res: LoginResponse = {
        token: '',
        user: {
          id: 1, username: 'u', cn_name: 'N', role: 'admin',
          selected_company: null, selected_project: null,
        },
      };
      expect(res.token).toBe('');
    });
  });

  // ============================================================
  // SaveSelectionRequest interface
  // ============================================================
  describe('SaveSelectionRequest interface', () => {
    it('should create a valid request with all fields', () => {
      const req: SaveSelectionRequest = { company_id: 1, project_id: 2 };
      expect(req.company_id).toBe(1);
      expect(req.project_id).toBe(2);
    });

    it('should allow project_id to be null', () => {
      const req: SaveSelectionRequest = { company_id: 1, project_id: null };
      expect(req.project_id).toBeNull();
    });

    it('should allow project_id to be undefined', () => {
      const req: SaveSelectionRequest = { company_id: 1 };
      expect(req.project_id).toBeUndefined();
    });

    it('should require company_id', () => {
      const req: SaveSelectionRequest = { company_id: 5 };
      expect(req.company_id).toBe(5);
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should have correct field names', () => {
      const req: SaveSelectionRequest = { company_id: 1, project_id: 2 };
      expect(Object.keys(req)).toEqual(['company_id', 'project_id']);
    });
  });

  // ============================================================
  // LoginSelectionError class
  // ============================================================
  describe('LoginSelectionError class', () => {
    it('should create an error with the correct message', () => {
      const error = new LoginSelectionError('请选择公司');
      expect(error.message).toBe('请选择公司');
    });

    it('should have the correct name property', () => {
      const error = new LoginSelectionError('test');
      expect(error.name).toBe('LoginSelectionError');
    });

    it('should be an instance of Error', () => {
      const error = new LoginSelectionError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of LoginSelectionError', () => {
      const error = new LoginSelectionError('test');
      expect(error).toBeInstanceOf(LoginSelectionError);
    });

    it('should preserve the error stack trace', () => {
      const error = new LoginSelectionError('stack test');
      expect(error.stack).toBeDefined();
    });

    it('should work with try-catch', () => {
      const throwError = (): never => {
        throw new LoginSelectionError('选择错误');
      };
      try {
        throwError();
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(LoginSelectionError);
        expect((e as LoginSelectionError).message).toBe('选择错误');
      }
    });

    it('should handle empty message', () => {
      const error = new LoginSelectionError('');
      expect(error.message).toBe('');
      expect(error.name).toBe('LoginSelectionError');
    });

    it('should be distinguishable from regular Error', () => {
      const regularError = new Error('regular');
      const selectionError = new LoginSelectionError('selection');
      expect(regularError).toBeInstanceOf(Error);
      expect(selectionError).toBeInstanceOf(Error);
      expect(regularError).not.toBeInstanceOf(LoginSelectionError);
      expect(selectionError).toBeInstanceOf(LoginSelectionError);
    });

    it('should support Chinese error messages', () => {
      const error = new LoginSelectionError('请先选择公司后再继续操作');
      expect(error.message).toBe('请先选择公司后再继续操作');
    });

    it('should have proper prototype chain', () => {
      const error = new LoginSelectionError('proto');
      expect(Object.getPrototypeOf(error)).toBe(LoginSelectionError.prototype);
    });

    it('should be catchable in async context', async () => {
      const asyncThrow = async (): Promise<void> => {
        throw new LoginSelectionError('异步错误');
      };
      await expect(asyncThrow()).rejects.toThrow(LoginSelectionError);
      await expect(asyncThrow()).rejects.toThrow('异步错误');
    });

    it('should support toString', () => {
      const error = new LoginSelectionError('toString测试');
      const str = error.toString();
      expect(str).toContain('LoginSelectionError');
      expect(str).toContain('toString测试');
    });

    it('should support long error messages', () => {
      const longMsg = '这是一条很长的错误消息'.repeat(20);
      const error = new LoginSelectionError(longMsg);
      expect(error.message).toBe(longMsg);
      expect(error.message.length).toBe(longMsg.length);
    });

    it('should be usable in error arrays', () => {
      const errors = [
        new LoginSelectionError('错误1'),
        new LoginSelectionError('错误2'),
        new Error('普通错误'),
      ];
      const selectionErrors = errors.filter(e => e instanceof LoginSelectionError);
      expect(selectionErrors).toHaveLength(2);
    });

    it('should work with Promise.allSettled', async () => {
      const promises = [
        Promise.resolve('ok'),
        Promise.reject(new LoginSelectionError('failed')),
      ];
      const results = await Promise.allSettled(promises);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(LoginSelectionError);
      }
    });
  });

  // ============================================================
  // PermissionDeniedError class
  // ============================================================
  describe('PermissionDeniedError class', () => {
    it('should create an error with the correct message', () => {
      const error = new PermissionDeniedError('权限不足');
      expect(error.message).toBe('权限不足');
    });

    it('should have the correct name property', () => {
      const error = new PermissionDeniedError('test');
      expect(error.name).toBe('PermissionDeniedError');
    });

    it('should be an instance of Error', () => {
      const error = new PermissionDeniedError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should be an instance of PermissionDeniedError', () => {
      const error = new PermissionDeniedError('test');
      expect(error).toBeInstanceOf(PermissionDeniedError);
    });

    it('should preserve the error stack trace', () => {
      const error = new PermissionDeniedError('stack test');
      expect(error.stack).toBeDefined();
    });

    it('should work with try-catch', () => {
      const throwError = (): never => {
        throw new PermissionDeniedError('无权限');
      };
      try {
        throwError();
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(PermissionDeniedError);
        expect((e as PermissionDeniedError).message).toBe('无权限');
      }
    });

    it('should handle empty message', () => {
      const error = new PermissionDeniedError('');
      expect(error.message).toBe('');
      expect(error.name).toBe('PermissionDeniedError');
    });

    it('should be distinguishable from regular Error', () => {
      const regularError = new Error('regular');
      const permError = new PermissionDeniedError('denied');
      expect(regularError).not.toBeInstanceOf(PermissionDeniedError);
      expect(permError).toBeInstanceOf(PermissionDeniedError);
    });

    it('should be distinguishable from LoginSelectionError', () => {
      const loginError = new LoginSelectionError('select');
      const permError = new PermissionDeniedError('denied');
      expect(loginError).not.toBeInstanceOf(PermissionDeniedError);
      expect(permError).not.toBeInstanceOf(LoginSelectionError);
    });

    it('should support Chinese error messages', () => {
      const error = new PermissionDeniedError('您没有权限执行此操作');
      expect(error.message).toBe('您没有权限执行此操作');
    });

    it('should have proper prototype chain', () => {
      const error = new PermissionDeniedError('proto');
      expect(Object.getPrototypeOf(error)).toBe(PermissionDeniedError.prototype);
    });

    it('should be catchable in async context', async () => {
      const asyncThrow = async (): Promise<void> => {
        throw new PermissionDeniedError('异步权限错误');
      };
      await expect(asyncThrow()).rejects.toThrow(PermissionDeniedError);
      await expect(asyncThrow()).rejects.toThrow('异步权限错误');
    });

    it('should support toString', () => {
      const error = new PermissionDeniedError('toString测试');
      const str = error.toString();
      expect(str).toContain('PermissionDeniedError');
      expect(str).toContain('toString测试');
    });

    it('should be usable in error arrays with filtering', () => {
      const errors = [
        new PermissionDeniedError('denied1'),
        new LoginSelectionError('select1'),
        new PermissionDeniedError('denied2'),
        new Error('generic'),
      ];
      const permErrors = errors.filter(e => e instanceof PermissionDeniedError);
      expect(permErrors).toHaveLength(2);
    });

    it('should work with Promise.allSettled', async () => {
      const promises = [
        Promise.resolve('ok'),
        Promise.reject(new PermissionDeniedError('forbidden')),
      ];
      const results = await Promise.allSettled(promises);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(PermissionDeniedError);
      }
    });
  });

  // ============================================================
  // UserListItem interface
  // ============================================================
  describe('UserListItem interface', () => {
    it('should create a valid UserListItem with all fields', () => {
      const item: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '测试公司',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.id).toBe(1);
      expect(item.company_name).toBe('测试公司');
    });

    it('should allow optional company_id to be null', () => {
      const item: UserListItem = {
        id: 1, username: 'sysadmin', cn_name: '系统管理员', role: 'sysadmin',
        status: true, company_id: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.company_id).toBeNull();
    });

    it('should allow optional company_name to be undefined', () => {
      const item: UserListItem = {
        id: 1, username: 'test', cn_name: '测试', role: 'view',
        status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.company_name).toBeUndefined();
    });

    it('should have correct required fields', () => {
      const item: UserListItem = {
        id: 1, username: 'u', cn_name: 'N', role: 'view',
        status: false,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(item).sort()).toEqual([
        'cn_name', 'created_at', 'id', 'role', 'status', 'updated_at', 'username',
      ]);
    });

    it('should have correct fields including optionals', () => {
      const item: UserListItem = {
        id: 1, username: 'u', cn_name: 'N', role: 'admin',
        status: true, company_id: 1, company_name: '公司',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(item).sort()).toEqual([
        'cn_name', 'company_id', 'company_name', 'created_at', 'id',
        'role', 'status', 'updated_at', 'username',
      ]);
    });

    it('should support all three roles', () => {
      const sysadmin: UserListItem = {
        id: 1, username: 'sa', cn_name: 'SA', role: 'sysadmin',
        status: true, created_at: new Date(), updated_at: new Date(),
      };
      const admin: UserListItem = {
        id: 2, username: 'ad', cn_name: 'AD', role: 'admin',
        status: true, created_at: new Date(), updated_at: new Date(),
      };
      const viewer: UserListItem = {
        id: 3, username: 'vw', cn_name: 'VW', role: 'view',
        status: true, created_at: new Date(), updated_at: new Date(),
      };
      expect(sysadmin.role).toBe('sysadmin');
      expect(admin.role).toBe('admin');
      expect(viewer.role).toBe('view');
    });

    it('should allow status to be false', () => {
      const item: UserListItem = {
        id: 1, username: 'disabled', cn_name: '已禁用', role: 'view',
        status: false,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.status).toBe(false);
    });

    it('should allow company_name to be empty string', () => {
      const item: UserListItem = {
        id: 1, username: 'u', cn_name: 'N', role: 'admin',
        status: true, company_name: '',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.company_name).toBe('');
    });

    it('should have Date types for timestamps', () => {
      const item: UserListItem = {
        id: 1, username: 'u', cn_name: 'N', role: 'admin',
        status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(item.created_at).toBeInstanceOf(Date);
      expect(item.updated_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // CreateUserRequest interface
  // ============================================================
  describe('CreateUserRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateUserRequest = {
        username: 'newuser', password: 'password123',
        cn_name: '新用户', role: 'view', company_id: 1,
      };
      expect(req.username).toBe('newuser');
      expect(req.password).toBe('password123');
      expect(req.cn_name).toBe('新用户');
      expect(req.role).toBe('view');
      expect(req.company_id).toBe(1);
    });

    it('should allow optional company_id to be null', () => {
      const req: CreateUserRequest = {
        username: 'sysadmin', password: 'pass',
        cn_name: '系统管理员', role: 'sysadmin', company_id: null,
      };
      expect(req.company_id).toBeNull();
    });

    it('should allow optional company_id to be undefined', () => {
      const req: CreateUserRequest = {
        username: 'test', password: 'pass', cn_name: '测试', role: 'admin',
      };
      expect(req.company_id).toBeUndefined();
    });

    it('should have correct required field names', () => {
      const req: CreateUserRequest = {
        username: 'u', password: 'p', cn_name: 'N', role: 'view',
      };
      expect(Object.keys(req)).toEqual(['username', 'password', 'cn_name', 'role']);
    });

    it('should have correct field names including company_id', () => {
      const req: CreateUserRequest = {
        username: 'u', password: 'p', cn_name: 'N', role: 'view', company_id: 1,
      };
      expect(Object.keys(req)).toEqual(['username', 'password', 'cn_name', 'role', 'company_id']);
    });

    it('should support all three roles', () => {
      const roles: UserRole[] = ['sysadmin', 'admin', 'view'];
      roles.forEach(role => {
        const req: CreateUserRequest = {
          username: 'u', password: 'p', cn_name: 'N', role,
        };
        expect(req.role).toBe(role);
      });
    });

    it('should support Chinese cn_name', () => {
      const req: CreateUserRequest = {
        username: 'user', password: 'pass', cn_name: '王小明', role: 'admin',
      };
      expect(req.cn_name).toBe('王小明');
    });

    it('should support empty string cn_name', () => {
      const req: CreateUserRequest = {
        username: 'user', password: 'pass', cn_name: '', role: 'view',
      };
      expect(req.cn_name).toBe('');
    });

    it('should support empty password', () => {
      const req: CreateUserRequest = {
        username: 'user', password: '', cn_name: 'N', role: 'admin',
      };
      expect(req.password).toBe('');
    });
  });

  // ============================================================
  // UpdateUserRequest interface
  // ============================================================
  describe('UpdateUserRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateUserRequest = {
        cn_name: '新名称', role: 'admin', status: true, password: 'newpassword',
      };
      expect(req.cn_name).toBe('新名称');
      expect(req.role).toBe('admin');
      expect(req.status).toBe(true);
      expect(req.password).toBe('newpassword');
    });

    it('should allow partial updates with single field', () => {
      const req: UpdateUserRequest = { cn_name: '只改名字' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateUserRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow status to be false', () => {
      const req: UpdateUserRequest = { status: false };
      expect(req.status).toBe(false);
    });

    it('should allow updating only cn_name', () => {
      const req: UpdateUserRequest = { cn_name: '新名称' };
      expect(req).toEqual({ cn_name: '新名称' });
    });

    it('should allow updating only role', () => {
      const req: UpdateUserRequest = { role: 'sysadmin' };
      expect(req.role).toBe('sysadmin');
    });

    it('should allow updating only status', () => {
      const req: UpdateUserRequest = { status: true };
      expect(req.status).toBe(true);
    });

    it('should allow updating only password', () => {
      const req: UpdateUserRequest = { password: 'newPass123' };
      expect(req.password).toBe('newPass123');
    });

    it('should allow updating cn_name and role together', () => {
      const req: UpdateUserRequest = { cn_name: '改名', role: 'admin' };
      expect(req.cn_name).toBe('改名');
      expect(req.role).toBe('admin');
      expect(Object.keys(req)).toHaveLength(2);
    });

    it('should allow updating role and status together', () => {
      const req: UpdateUserRequest = { role: 'view', status: false };
      expect(req.role).toBe('view');
      expect(req.status).toBe(false);
    });

    it('should allow updating password and status together', () => {
      const req: UpdateUserRequest = { password: 'abc', status: true };
      expect(req.password).toBe('abc');
      expect(req.status).toBe(true);
    });

    it('should support all three roles in update', () => {
      const roles: UserRole[] = ['sysadmin', 'admin', 'view'];
      roles.forEach(role => {
        const req: UpdateUserRequest = { role };
        expect(req.role).toBe(role);
      });
    });

    it('should have correct field names when all present', () => {
      const req: UpdateUserRequest = {
        cn_name: 'a', role: 'admin', status: true, password: 'b',
      };
      expect(Object.keys(req).sort()).toEqual(['cn_name', 'password', 'role', 'status']);
    });

    it('should allow empty password string', () => {
      const req: UpdateUserRequest = { password: '' };
      expect(req.password).toBe('');
    });
  });

  // ============================================================
  // Cross-interface integration
  // ============================================================
  describe('cross-interface integration', () => {
    it('User and UserListItem share common fields', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const listItem: UserListItem = {
        id: user.id, username: user.username, cn_name: user.cn_name,
        role: user.role, status: user.status, company_id: user.company_id,
        created_at: user.created_at, updated_at: user.updated_at,
      };
      expect(listItem.id).toBe(user.id);
      expect(listItem.username).toBe(user.username);
      expect(listItem.role).toBe(user.role);
    });

    it('CreateUserRequest fields can seed a User', () => {
      const createReq: CreateUserRequest = {
        username: 'new', password: 'pass', cn_name: '新用户',
        role: 'admin', company_id: 1,
      };
      const user: User = {
        id: 10,
        username: createReq.username,
        password_hash: 'hashed_' + createReq.password,
        cn_name: createReq.cn_name,
        role: createReq.role,
        status: true,
        company_id: createReq.company_id,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(user.username).toBe('new');
      expect(user.cn_name).toBe('新用户');
      expect(user.role).toBe('admin');
    });

    it('UpdateUserRequest can partially override User fields', () => {
      const original: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: '旧名',
        role: 'view', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateUserRequest = { cn_name: '新名', status: false };
      const updated: User = { ...original, ...update, updated_at: new Date() };
      expect(updated.cn_name).toBe('新名');
      expect(updated.status).toBe(false);
      expect(updated.role).toBe('view');
      expect(updated.username).toBe('u');
    });

    it('LoginRequest fields can be used for authentication', () => {
      const loginReq: LoginRequest = { username: 'admin', password: 'secret' };
      expect(typeof loginReq.username).toBe('string');
      expect(typeof loginReq.password).toBe('string');
      expect(loginReq.username.length).toBeGreaterThan(0);
      expect(loginReq.password.length).toBeGreaterThan(0);
    });

    it('LoginResponse user field contains role from UserRole', () => {
      const validRoles: UserRole[] = ['sysadmin', 'admin', 'view'];
      validRoles.forEach(role => {
        const res: LoginResponse = {
          token: 't',
          user: {
            id: 1, username: 'u', cn_name: 'N', role,
            selected_company: null, selected_project: null,
          },
        };
        expect(validRoles).toContain(res.user.role);
      });
    });

    it('SaveSelectionRequest company_id matches User company_id', () => {
      const user: User = {
        id: 1, username: 'u', password_hash: 'h', cn_name: 'N',
        role: 'admin', status: true, company_id: 5,
        created_at: new Date(), updated_at: new Date(),
      };
      const selection: SaveSelectionRequest = {
        company_id: user.company_id!,
        project_id: 10,
      };
      expect(selection.company_id).toBe(user.company_id);
    });
  });

  // ============================================================
  // Re-exports from index
  // ============================================================
  describe('re-exports from index', () => {
    it('should re-export LoginSelectionError class from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.LoginSelectionError).toBeDefined();
      expect(typeof indexModule.LoginSelectionError).toBe('function');
    });

    it('should compile correctly when importing types from index.ts', () => {
      const user: User = {
        id: 1, username: 'test', password_hash: 'hash', cn_name: '测试',
        role: 'admin', status: true, company_id: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.role).toBe('admin');
    });

    it('LoginSelectionError from index should be same class', async () => {
      const indexModule = await import('../../apis/entity/index');
      const error = new indexModule.LoginSelectionError('from index');
      expect(error).toBeInstanceOf(LoginSelectionError);
      expect(error.message).toBe('from index');
      expect(error.name).toBe('LoginSelectionError');
    });
  });

  // ============================================================
  // JSON 序列化往返
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('User should survive JSON round-trip with Date reviver', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-06-15T08:30:00.000Z'),
        updated_at: new Date('2024-06-20T14:45:00.000Z'),
      };
      const json = JSON.stringify(user);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(1);
      expect(parsed.username).toBe('admin');
      expect(parsed.cn_name).toBe('管理员');
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });

    it('User should preserve optional null fields through JSON round-trip', () => {
      const user: User = {
        id: 2, username: 'sysadmin', password_hash: 'h', cn_name: '系统管理员',
        role: 'sysadmin', status: true, company_id: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(user);
      const parsed = JSON.parse(json);
      expect(parsed.company_id).toBeNull();
    });

    it('User should preserve Chinese characters through JSON round-trip', () => {
      const user: User = {
        id: 1, username: 'zhangsan', password_hash: 'h', cn_name: '张三李四',
        role: 'admin', status: true, company_id: 5,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(user);
      const parsed = JSON.parse(json);
      expect(parsed.cn_name).toBe('张三李四');
    });

    it('User should preserve boolean status through JSON round-trip', () => {
      const activeUser: User = {
        id: 1, username: 'active', password_hash: 'h', cn_name: 'A',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const disabledUser: User = {
        id: 2, username: 'disabled', password_hash: 'h', cn_name: 'D',
        role: 'view', status: false,
        created_at: new Date(), updated_at: new Date(),
      };
      const parsedActive = JSON.parse(JSON.stringify(activeUser));
      const parsedDisabled = JSON.parse(JSON.stringify(disabledUser));
      expect(parsedActive.status).toBe(true);
      expect(parsedDisabled.status).toBe(false);
    });

    it('User array should survive JSON round-trip', () => {
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h1', cn_name: '用户1',
          role: 'sysadmin', status: true, company_id: null,
          created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, username: 'u2', password_hash: 'h2', cn_name: '用户2',
          role: 'admin', status: true, company_id: 1,
          created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      ];
      const json = JSON.stringify(users);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].username).toBe('u1');
      expect(parsed[1].role).toBe('admin');
    });

    it('LoginRequest should survive JSON round-trip', () => {
      const req: LoginRequest = { username: 'admin', password: 'secret123' };
      const json = JSON.stringify(req);
      const restored: LoginRequest = JSON.parse(json);
      expect(restored.username).toBe('admin');
      expect(restored.password).toBe('secret123');
    });

    it('LoginResponse should survive JSON round-trip', () => {
      const res: LoginResponse = {
        token: 'jwt.token.value',
        user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          company_id: 1,
          selected_company: { id: 1, short_name: '薄云科技' },
          selected_project: { id: 2, short_name: '项目A' },
        },
      };
      const json = JSON.stringify(res);
      const restored: LoginResponse = JSON.parse(json);
      expect(restored.token).toBe('jwt.token.value');
      expect(restored.user.cn_name).toBe('管理员');
      expect(restored.user.selected_company).toEqual({ id: 1, short_name: '薄云科技' });
    });

    it('SaveSelectionRequest should survive JSON round-trip', () => {
      const req: SaveSelectionRequest = { company_id: 5, project_id: 10 };
      const json = JSON.stringify(req);
      const restored: SaveSelectionRequest = JSON.parse(json);
      expect(restored.company_id).toBe(5);
      expect(restored.project_id).toBe(10);
    });

    it('CreateUserRequest should survive JSON round-trip', () => {
      const req: CreateUserRequest = {
        username: 'newuser', password: 'pass123', cn_name: '新用户',
        role: 'admin', company_id: 3,
      };
      const json = JSON.stringify(req);
      const restored: CreateUserRequest = JSON.parse(json);
      expect(restored.username).toBe('newuser');
      expect(restored.role).toBe('admin');
      expect(restored.company_id).toBe(3);
    });

    it('UpdateUserRequest should survive JSON round-trip', () => {
      const req: UpdateUserRequest = { cn_name: '新名称', status: false };
      const json = JSON.stringify(req);
      const restored: UpdateUserRequest = JSON.parse(json);
      expect(restored.cn_name).toBe('新名称');
      expect(restored.status).toBe(false);
    });

    it('UserListItem should survive JSON round-trip', () => {
      const item: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '薄云科技',
        created_at: new Date('2024-06-15T00:00:00.000Z'),
        updated_at: new Date('2024-06-20T00:00:00.000Z'),
      };
      const json = JSON.stringify(item);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.company_name).toBe('薄云科技');
      expect(parsed.created_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // Object.freeze 不可变性
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen User should reject id mutation', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (user as any).id = 999; }).toThrow();
      expect(user.id).toBe(1);
    });

    it('frozen User should reject username mutation', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (user as any).username = 'hacked'; }).toThrow();
      expect(user.username).toBe('admin');
    });

    it('frozen User should reject role mutation', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (user as any).role = 'sysadmin'; }).toThrow();
      expect(user.role).toBe('admin');
    });

    it('frozen User should reject status mutation', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (user as any).status = false; }).toThrow();
      expect(user.status).toBe(true);
    });

    it('frozen User should reject adding new fields', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (user as any).extra = 'field'; }).toThrow();
      expect((user as any).extra).toBeUndefined();
    });

    it('frozen User should reject deleting fields', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { delete (user as any).username; }).toThrow();
      expect(user.username).toBe('admin');
    });

    it('frozen LoginRequest should reject mutation', () => {
      const req: LoginRequest = Object.freeze({ username: 'admin', password: 'pass' });
      expect(() => { (req as any).username = 'hacked'; }).toThrow();
      expect(req.username).toBe('admin');
    });

    it('frozen LoginResponse should reject mutation', () => {
      const res: LoginResponse = Object.freeze({
        token: 'jwt',
        user: { id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          selected_company: null, selected_project: null },
      });
      expect(() => { (res as any).token = 'hacked'; }).toThrow();
      expect(res.token).toBe('jwt');
    });

    it('frozen SaveSelectionRequest should reject mutation', () => {
      const req: SaveSelectionRequest = Object.freeze({ company_id: 1, project_id: 2 });
      expect(() => { (req as any).company_id = 999; }).toThrow();
      expect(req.company_id).toBe(1);
    });

    it('frozen UserListItem should reject mutation', () => {
      const item: UserListItem = Object.freeze({
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '公司',
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (item as any).cn_name = 'hacked'; }).toThrow();
      expect(item.cn_name).toBe('管理员');
    });

    it('frozen CreateUserRequest should reject mutation', () => {
      const req: CreateUserRequest = Object.freeze({
        username: 'new', password: 'pass', cn_name: '新用户', role: 'admin',
      });
      expect(() => { (req as any).role = 'sysadmin'; }).toThrow();
      expect(req.role).toBe('admin');
    });

    it('frozen UpdateUserRequest should reject mutation', () => {
      const req: UpdateUserRequest = Object.freeze({ cn_name: '名字', status: true });
      expect(() => { (req as any).status = false; }).toThrow();
      expect(req.status).toBe(true);
    });

    it('frozen User should still be readable via Object.keys', () => {
      const user: User = Object.freeze({
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(Object.keys(user)).toHaveLength(9);
      expect(Object.isFrozen(user)).toBe(true);
    });
  });

  // ============================================================
  // 结构相等性
  // ============================================================
  describe('structural equality', () => {
    it('two Users with same values should be structurally equal', () => {
      const date = new Date('2024-06-01T00:00:00.000Z');
      const u1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      const u2: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      expect(u1).toEqual(u2);
      expect(u1).not.toBe(u2);
    });

    it('Users with different id should not be equal', () => {
      const date = new Date();
      const u1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      const u2: User = { ...u1, id: 2 };
      expect(u1).not.toEqual(u2);
    });

    it('Users with different role should not be equal', () => {
      const date = new Date();
      const u1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      const u2: User = { ...u1, role: 'view' };
      expect(u1).not.toEqual(u2);
    });

    it('Users with different status should not be equal', () => {
      const date = new Date();
      const u1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      const u2: User = { ...u1, status: false };
      expect(u1).not.toEqual(u2);
    });

    it('Users with different company_id should not be equal', () => {
      const date = new Date();
      const u1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      };
      const u2: User = { ...u1, company_id: 2 };
      expect(u1).not.toEqual(u2);
    });

    it('should compare by id for lookup purposes', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'viewer', password_hash: 'h', cn_name: '查看者',
          role: 'view', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const found = users.find(u => u.id === 2);
      expect(found).toBeDefined();
      expect(found!.role).toBe('view');
    });

    it('two LoginRequests with same values should be structurally equal', () => {
      const r1: LoginRequest = { username: 'admin', password: 'pass' };
      const r2: LoginRequest = { username: 'admin', password: 'pass' };
      expect(r1).toEqual(r2);
      expect(r1).not.toBe(r2);
    });

    it('two LoginResponses with same values should be structurally equal', () => {
      const r1: LoginResponse = {
        token: 'jwt', user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          selected_company: null, selected_project: null,
        },
      };
      const r2: LoginResponse = {
        token: 'jwt', user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          selected_company: null, selected_project: null,
        },
      };
      expect(r1).toEqual(r2);
      expect(r1).not.toBe(r2);
    });

    it('two UserListItems with same values should be structurally equal', () => {
      const date = new Date('2024-01-01');
      const i1: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '公司',
        created_at: date, updated_at: date,
      };
      const i2: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '公司',
        created_at: date, updated_at: date,
      };
      expect(i1).toEqual(i2);
      expect(i1).not.toBe(i2);
    });
  });

  // ============================================================
  // 深拷贝
  // ============================================================
  describe('deep copy', () => {
    it('JSON parse/stringify should create deep copy of User', () => {
      const original: User = {
        id: 1, username: 'admin', password_hash: 'hashed', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-06-01T00:00:00.000Z'),
        updated_at: new Date('2024-06-02T00:00:00.000Z'),
      };
      const json = JSON.stringify(original);
      const copy: User = {
        ...JSON.parse(json),
        created_at: new Date(JSON.parse(json).created_at),
        updated_at: new Date(JSON.parse(json).updated_at),
      };
      expect(copy).toEqual(original);
      copy.cn_name = '修改名字';
      expect(original.cn_name).toBe('管理员');
    });

    it('spread operator creates shallow copy with independent top-level fields', () => {
      const original: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const copy = { ...original };
      copy.cn_name = '新名字';
      copy.status = false;
      expect(original.cn_name).toBe('管理员');
      expect(original.status).toBe(true);
    });

    it('structuredClone should create deep copy of User', () => {
      const original: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-06-15T12:00:00.000Z'),
        updated_at: new Date('2024-06-20T12:00:00.000Z'),
      };
      const clone = structuredClone(original);
      expect(clone.id).toBe(original.id);
      expect(clone.cn_name).toBe(original.cn_name);
      expect(clone.created_at).toEqual(original.created_at);
      expect(clone.created_at).not.toBe(original.created_at);
      clone.cn_name = '修改';
      expect(original.cn_name).toBe('管理员');
    });

    it('deep copy of User array should be independent', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const copy = users.map(u => ({ ...u }));
      copy[0].cn_name = '修改';
      expect(users[0].cn_name).toBe('用户1');
    });

    it('structuredClone of LoginResponse should deep copy nested objects', () => {
      const original: LoginResponse = {
        token: 'jwt',
        user: {
          id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          company_id: 1,
          selected_company: { id: 1, short_name: '薄云科技' },
          selected_project: { id: 2, short_name: '项目A' },
        },
      };
      const clone = structuredClone(original);
      clone.user.cn_name = '修改';
      clone.user.selected_company!.short_name = '修改公司';
      expect(original.user.cn_name).toBe('管理员');
      expect(original.user.selected_company!.short_name).toBe('薄云科技');
    });
  });

  // ============================================================
  // 解构模式
  // ============================================================
  describe('destructuring patterns', () => {
    it('should support destructuring User with rename', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id: userId, username: userName, role: userRole } = user;
      expect(userId).toBe(1);
      expect(userName).toBe('admin');
      expect(userRole).toBe('admin');
    });

    it('should support destructuring in array map', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: false, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const names = users.map(({ cn_name }) => cn_name);
      expect(names).toEqual(['用户1', '用户2']);
    });

    it('should support destructuring LoginRequest fields', () => {
      const req: LoginRequest = { username: 'admin', password: 'secret' };
      const { username, password } = req;
      expect(username).toBe('admin');
      expect(password).toBe('secret');
    });

    it('should support rest pattern with UpdateUserRequest', () => {
      const req: UpdateUserRequest = { cn_name: '新名', role: 'admin', status: true };
      const { cn_name, ...rest } = req;
      expect(cn_name).toBe('新名');
      expect(rest.role).toBe('admin');
      expect(rest.status).toBe(true);
    });

    it('should support destructuring LoginResponse nested user', () => {
      const res: LoginResponse = {
        token: 'jwt',
        user: { id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
          company_id: 1, selected_company: { id: 1, short_name: 'C' },
          selected_project: null },
      };
      const { token, user: { cn_name, role } } = res;
      expect(token).toBe('jwt');
      expect(cn_name).toBe('管理员');
      expect(role).toBe('admin');
    });

    it('should support destructuring CreateUserRequest fields', () => {
      const req: CreateUserRequest = {
        username: 'new', password: 'pass', cn_name: '新用户', role: 'view',
      };
      const { username, password, cn_name, role } = req;
      expect(username).toBe('new');
      expect(password).toBe('pass');
      expect(cn_name).toBe('新用户');
      expect(role).toBe('view');
    });

    it('should support destructuring UserListItem with omit', () => {
      const item: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, company_id: 1, company_name: '公司',
        created_at: new Date(), updated_at: new Date(),
      };
      const { created_at, updated_at, ...displayFields } = item;
      expect(Object.keys(displayFields)).toHaveLength(7);
      expect(displayFields.id).toBe(1);
      expect(displayFields.company_name).toBe('公司');
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('collection advanced operations', () => {
    it('should support Map with user id as key', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'viewer', password_hash: 'h', cn_name: '查看者',
          role: 'view', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const map = new Map(users.map(u => [u.id, u]));
      expect(map.get(1)?.cn_name).toBe('管理员');
      expect(map.get(2)?.role).toBe('view');
      expect(map.size).toBe(2);
    });

    it('should support grouping users by role', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'sa', password_hash: 'h', cn_name: 'SA',
          role: 'sysadmin', status: true, company_id: null,
          created_at: date, updated_at: date },
        { id: 2, username: 'ad', password_hash: 'h', cn_name: '管理员',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 3, username: 'vw', password_hash: 'h', cn_name: '查看者',
          role: 'view', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 4, username: 'ad2', password_hash: 'h', cn_name: '管理员2',
          role: 'admin', status: false, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const grouped = users.reduce<Record<string, User[]>>((acc, u) => {
        if (!acc[u.role]) acc[u.role] = [];
        acc[u.role].push(u);
        return acc;
      }, {});
      expect(grouped['sysadmin']).toHaveLength(1);
      expect(grouped['admin']).toHaveLength(2);
      expect(grouped['view']).toHaveLength(1);
    });

    it('should support converting users to Record by id', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const record = users.reduce<Record<number, User>>((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
      expect(record[1].cn_name).toBe('用户1');
      expect(record[2].role).toBe('view');
    });

    it('should support Map delete and has operations', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const map = new Map<number, User>();
      map.set(user.id, user);
      expect(map.has(1)).toBe(true);
      map.delete(1);
      expect(map.has(1)).toBe(false);
      expect(map.size).toBe(0);
    });

    it('should support Set deduplication by reference', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<User>();
      set.add(user);
      set.add(user);
      expect(set.size).toBe(1);
    });

    it('should support filtering users by status', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'active', password_hash: 'h', cn_name: '活跃',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'disabled', password_hash: 'h', cn_name: '已禁用',
          role: 'view', status: false, company_id: 2,
          created_at: date, updated_at: date },
        { id: 3, username: 'active2', password_hash: 'h', cn_name: '活跃2',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
      ];
      const activeUsers = users.filter(u => u.status);
      expect(activeUsers).toHaveLength(2);
      const disabledUsers = users.filter(u => !u.status);
      expect(disabledUsers).toHaveLength(1);
    });

    it('should support sorting users by id', () => {
      const date = new Date();
      const users: User[] = [
        { id: 3, username: 'u3', password_hash: 'h', cn_name: 'C',
          role: 'view', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 1, username: 'u1', password_hash: 'h', cn_name: 'A',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: 'B',
          role: 'admin', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const sorted = [...users].sort((a, b) => a.id - b.id);
      expect(sorted.map(u => u.id)).toEqual([1, 2, 3]);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('continuous update chain', () => {
    it('should support sequential updates with immutable pattern', () => {
      const created = new Date('2024-01-01');
      let user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'view', status: true, company_id: 1,
        created_at: created, updated_at: created,
      };

      user = { ...user, role: 'admin', updated_at: new Date('2024-02-01') };
      expect(user.role).toBe('admin');

      user = { ...user, cn_name: '高级管理员', updated_at: new Date('2024-06-01') };
      expect(user.cn_name).toBe('高级管理员');
      expect(user.created_at).toBe(created);
    });

    it('should support batch sequential updates across multiple users', () => {
      const now = new Date('2024-01-01');
      let users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: now, updated_at: now },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: true, company_id: 1,
          created_at: now, updated_at: now },
      ];

      const updateDate = new Date('2024-03-01');
      users = users.map(u =>
        u.id === 1 ? { ...u, status: false, updated_at: updateDate } : u
      );
      expect(users[0].status).toBe(false);
      expect(users[1].status).toBe(true);

      users = [...users, {
        id: 3, username: 'u3', password_hash: 'h', cn_name: '用户3',
        role: 'admin', status: true, company_id: 2,
        created_at: updateDate, updated_at: updateDate,
      }];
      expect(users).toHaveLength(3);

      users = users.filter(u => u.status);
      expect(users).toHaveLength(2);
    });

    it('should track update history via timestamps', () => {
      const v1Date = new Date('2024-01-01');
      const v2Date = new Date('2024-03-01');
      const v3Date = new Date('2024-06-01');

      const v1: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'view', status: true, company_id: 1,
        created_at: v1Date, updated_at: v1Date,
      };
      const v2: User = { ...v1, role: 'admin', updated_at: v2Date };
      const v3: User = { ...v2, cn_name: '高级管理员', updated_at: v3Date };

      const history = [v1, v2, v3];
      expect(history).toHaveLength(3);
      expect(history[0].updated_at.getTime()).toBeLessThan(history[1].updated_at.getTime());
      expect(history[1].updated_at.getTime()).toBeLessThan(history[2].updated_at.getTime());
      expect(history.every(v => v.created_at === v1Date)).toBe(true);
    });
  });

  // ============================================================
  // 日期操作
  // ============================================================
  describe('date operations', () => {
    it('should support toISOString for display', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-06-15T08:30:45.123Z'),
        updated_at: new Date('2024-06-20T14:45:00.000Z'),
      };
      expect(user.created_at.toISOString()).toBe('2024-06-15T08:30:45.123Z');
      expect(user.updated_at.toISOString()).toBe('2024-06-20T14:45:00.000Z');
    });

    it('should support getTime for difference calculation', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-02T12:00:00.000Z'),
      };
      const diffMs = user.updated_at.getTime() - user.created_at.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(36);
    });

    it('should support extracting date components', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2024-06-15T08:30:45.123Z'),
        updated_at: new Date(),
      };
      expect(user.created_at.getUTCFullYear()).toBe(2024);
      expect(user.created_at.getUTCMonth()).toBe(5);
      expect(user.created_at.getUTCDate()).toBe(15);
    });

    it('should support Date.now() comparison', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date('2020-01-01'),
        updated_at: new Date('2020-01-01'),
      };
      expect(user.created_at.getTime()).toBeLessThan(Date.now());
    });

    it('UserListItem timestamps should support millisecond precision', () => {
      const item: UserListItem = {
        id: 1, username: 'admin', cn_name: '管理员', role: 'admin',
        status: true, created_at: new Date('2024-06-15T12:30:45.456Z'),
        updated_at: new Date('2024-06-15T12:30:45.789Z'),
      };
      expect(item.created_at.getMilliseconds()).toBe(456);
      expect(item.updated_at.getMilliseconds()).toBe(789);
    });
  });

  // ============================================================
  // Set-Map 操作扩展
  // ============================================================
  describe('Set-Map operations', () => {
    it('should support WeakMap with User object keys', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const weakMap = new WeakMap<User, string>();
      weakMap.set(user, 'metadata');
      expect(weakMap.get(user)).toBe('metadata');
    });

    it('should support Map forEach iteration', () => {
      const date = new Date();
      const map = new Map<string, User>();
      map.set('a', {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: date, updated_at: date,
      });
      map.set('b', {
        id: 2, username: 'viewer', password_hash: 'h', cn_name: '查看者',
        role: 'view', status: true, company_id: 2,
        created_at: date, updated_at: date,
      });
      const collected: string[] = [];
      map.forEach((value, key) => {
        collected.push(key + ':' + value.cn_name);
      });
      expect(collected).toEqual(['a:管理员', 'b:查看者']);
    });

    it('should support Map construction from entries', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: true, company_id: 2,
          created_at: date, updated_at: date },
      ];
      const map = new Map(users.map(u => [u.id, u.cn_name] as [number, string]));
      expect(map.get(1)).toBe('用户1');
      expect(map.get(2)).toBe('用户2');
    });

    it('should support Set with role deduplication', () => {
      const roles: UserRole[] = ['sysadmin', 'admin', 'view', 'admin', 'view'];
      const uniqueRoles = [...new Set(roles)];
      expect(uniqueRoles).toEqual(['sysadmin', 'admin', 'view']);
    });
  });

  // ============================================================
  // 属性描述符
  // ============================================================
  describe('property descriptors', () => {
    it('should have writable, enumerable, configurable descriptors by default', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const desc = Object.getOwnPropertyDescriptor(user, 'username');
      expect(desc).toBeDefined();
      expect(desc!.writable).toBe(true);
      expect(desc!.enumerable).toBe(true);
      expect(desc!.configurable).toBe(true);
    });

    it('should support defining non-enumerable property', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.defineProperty(user, 'password_hash', { enumerable: false });
      expect(Object.keys(user)).toHaveLength(8);
      expect(user.password_hash).toBe('h');
    });

    it('should support defining read-only property via defineProperty', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.defineProperty(user, 'id', { writable: false });
      expect(() => { (user as any).id = 999; }).toThrow();
      expect(user.id).toBe(1);
    });

    it('should list all property descriptors for User', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const descriptors = Object.getOwnPropertyDescriptors(user);
      expect(Object.keys(descriptors)).toHaveLength(9);
    });

    it('should list property descriptors for LoginRequest', () => {
      const req: LoginRequest = { username: 'admin', password: 'pass' };
      const descriptors = Object.getOwnPropertyDescriptors(req);
      expect(Object.keys(descriptors)).toHaveLength(2);
    });

    it('should list property descriptors for UpdateUserRequest', () => {
      const req: UpdateUserRequest = { cn_name: '名字', role: 'admin' };
      const descriptors = Object.getOwnPropertyDescriptors(req);
      expect(Object.keys(descriptors)).toHaveLength(2);
    });
  });

  // ============================================================
  // 函数参数传递
  // ============================================================
  describe('function parameter passing', () => {
    it('should pass User to function and access fields', () => {
      const getDisplayName = (user: User): string => {
        return `${user.cn_name}(${user.username})`;
      };
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(getDisplayName(user)).toBe('管理员(admin)');
    });

    it('should pass LoginRequest to function', () => {
      const validateLogin = (req: LoginRequest): boolean => {
        return req.username.length > 0 && req.password.length > 0;
      };
      const valid: LoginRequest = { username: 'admin', password: 'pass' };
      const invalid: LoginRequest = { username: '', password: '' };
      expect(validateLogin(valid)).toBe(true);
      expect(validateLogin(invalid)).toBe(false);
    });

    it('should return User from function', () => {
      const createUser = (username: string, cnName: string, role: UserRole): User => ({
        id: 1, username, password_hash: 'hashed', cn_name: cnName,
        role, status: true, company_id: null,
        created_at: new Date(), updated_at: new Date(),
      });
      const user = createUser('newuser', '新用户', 'view');
      expect(user.username).toBe('newuser');
      expect(user.cn_name).toBe('新用户');
      expect(user.role).toBe('view');
    });

    it('should accept Partial<User> as function parameter', () => {
      const mergeDefaults = (partial: Partial<User>): User => ({
        id: partial.id ?? 0,
        username: partial.username ?? '',
        password_hash: partial.password_hash ?? '',
        cn_name: partial.cn_name ?? '',
        role: partial.role ?? 'view',
        status: partial.status ?? true,
        company_id: partial.company_id ?? null,
        created_at: partial.created_at ?? new Date(),
        updated_at: partial.updated_at ?? new Date(),
      });
      const user = mergeDefaults({ cn_name: '自定义名字', role: 'admin' });
      expect(user.cn_name).toBe('自定义名字');
      expect(user.role).toBe('admin');
      expect(user.status).toBe(true);
      expect(user.id).toBe(0);
    });

    it('should handle user transformation pipeline', () => {
      const date = new Date();
      const users: User[] = [
        { id: 1, username: 'u1', password_hash: 'h', cn_name: '用户1',
          role: 'admin', status: true, company_id: 1,
          created_at: date, updated_at: date },
        { id: 2, username: 'u2', password_hash: 'h', cn_name: '用户2',
          role: 'view', status: false, company_id: 2,
          created_at: date, updated_at: date },
      ];

      const names = users.map(u => u.cn_name);
      expect(names).toEqual(['用户1', '用户2']);

      const activeCount = users.filter(u => u.status).length;
      expect(activeCount).toBe(1);

      const hasAdmin = users.some(u => u.role === 'admin');
      expect(hasAdmin).toBe(true);

      const allHaveId = users.every(u => u.id > 0);
      expect(allHaveId).toBe(true);
    });

    it('should pass SaveSelectionRequest to function', () => {
      const formatSelection = (req: SaveSelectionRequest): string => {
        return `选择公司${req.company_id}${req.project_id ? ' 项目' + req.project_id : ''}`;
      };
      const req1: SaveSelectionRequest = { company_id: 5, project_id: 10 };
      const req2: SaveSelectionRequest = { company_id: 3 };
      expect(formatSelection(req1)).toBe('选择公司5 项目10');
      expect(formatSelection(req2)).toBe('选择公司3');
    });

    it('should support Promise<User> pattern', async () => {
      const loadUser = (): Promise<User> => {
        return Promise.resolve({
          id: 1, username: 'async_user', password_hash: 'h', cn_name: '异步用户',
          role: 'admin', status: true, company_id: 1,
          created_at: new Date(), updated_at: new Date(),
        });
      };
      const user = await loadUser();
      expect(user.cn_name).toBe('异步用户');
    });

    it('should support Record transformation from User', () => {
      const user: User = {
        id: 1, username: 'admin', password_hash: 'h', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
        created_at: new Date(), updated_at: new Date(),
      };
      const record: Record<string, unknown> = { ...user };
      expect(record.id).toBe(1);
      expect(record.cn_name).toBe('管理员');
    });

    it('should support Pick<User, "id" | "cn_name" | "role"> pattern', () => {
      const picked: Pick<User, 'id' | 'cn_name' | 'role'> = {
        id: 1, cn_name: '管理员', role: 'admin',
      };
      expect(picked.id).toBe(1);
      expect(picked.cn_name).toBe('管理员');
      expect(picked.role).toBe('admin');
    });

    it('should support Omit<User, "password_hash" | "created_at" | "updated_at"> pattern', () => {
      const omitted: Omit<User, 'password_hash' | 'created_at' | 'updated_at'> = {
        id: 1, username: 'admin', cn_name: '管理员',
        role: 'admin', status: true, company_id: 1,
      };
      expect(omitted.id).toBe(1);
    });

    it('should pass CreateUserRequest to function and transform', () => {
      const toUser = (req: CreateUserRequest, id: number): User => ({
        id,
        username: req.username,
        password_hash: 'hashed_' + req.password,
        cn_name: req.cn_name,
        role: req.role,
        status: true,
        company_id: req.company_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const req: CreateUserRequest = {
        username: 'newuser', password: 'pass123', cn_name: '新用户',
        role: 'admin', company_id: 5,
      };
      const user = toUser(req, 10);
      expect(user.id).toBe(10);
      expect(user.password_hash).toBe('hashed_pass123');
      expect(user.company_id).toBe(5);
    });
  });
});
