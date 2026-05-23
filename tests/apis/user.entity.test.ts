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
});
