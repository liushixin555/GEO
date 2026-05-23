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
  describe('UserRole type', () => {
    it('should accept valid role values', () => {
      const roles: UserRole[] = ['sysadmin', 'admin', 'view'];
      expect(roles).toContain('sysadmin');
      expect(roles).toContain('admin');
      expect(roles).toContain('view');
      expect(roles).toHaveLength(3);
    });
  });

  describe('User interface', () => {
    it('should create a valid User object with all required fields', () => {
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

    it('should allow optional company_id to be null', () => {
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

    it('should allow optional company_id to be undefined', () => {
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
  });

  describe('LoginRequest interface', () => {
    it('should create a valid LoginRequest object', () => {
      const req: LoginRequest = {
        username: 'admin',
        password: 'password123',
      };
      expect(req.username).toBe('admin');
      expect(req.password).toBe('password123');
    });

    it('should have exactly username and password fields', () => {
      const req: LoginRequest = {
        username: 'test',
        password: 'test',
      };
      expect(Object.keys(req)).toEqual(['username', 'password']);
    });
  });

  describe('LoginResponse interface', () => {
    it('should create a valid LoginResponse with selected_company and selected_project', () => {
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
          id: 1,
          username: 'admin',
          cn_name: '管理员',
          role: 'admin',
          company_id: null,
          selected_company: null,
          selected_project: null,
        },
      };
      expect(res.user.selected_company).toBeNull();
      expect(res.user.selected_project).toBeNull();
    });

    it('should allow company_id to be undefined', () => {
      const res: LoginResponse = {
        token: 'token',
        user: {
          id: 1,
          username: 'admin',
          cn_name: '管理员',
          role: 'admin',
          selected_company: null,
          selected_project: null,
        },
      };
      expect(res.user.company_id).toBeUndefined();
    });
  });

  describe('SaveSelectionRequest interface', () => {
    it('should create a valid request with all fields', () => {
      const req: SaveSelectionRequest = {
        company_id: 1,
        project_id: 2,
      };
      expect(req.company_id).toBe(1);
      expect(req.project_id).toBe(2);
    });

    it('should allow project_id to be null', () => {
      const req: SaveSelectionRequest = {
        company_id: 1,
        project_id: null,
      };
      expect(req.project_id).toBeNull();
    });

    it('should allow project_id to be undefined', () => {
      const req: SaveSelectionRequest = {
        company_id: 1,
      };
      expect(req.project_id).toBeUndefined();
    });
  });

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
  });

  describe('UserListItem interface', () => {
    it('should create a valid UserListItem with all fields', () => {
      const item: UserListItem = {
        id: 1,
        username: 'admin',
        cn_name: '管理员',
        role: 'admin',
        status: true,
        company_id: 1,
        company_name: '测试公司',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.id).toBe(1);
      expect(item.company_name).toBe('测试公司');
    });

    it('should allow optional company_id to be null', () => {
      const item: UserListItem = {
        id: 1,
        username: 'sysadmin',
        cn_name: '系统管理员',
        role: 'sysadmin',
        status: true,
        company_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.company_id).toBeNull();
    });

    it('should allow optional company_name to be undefined', () => {
      const item: UserListItem = {
        id: 1,
        username: 'test',
        cn_name: '测试',
        role: 'view',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.company_name).toBeUndefined();
    });
  });

  describe('CreateUserRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateUserRequest = {
        username: 'newuser',
        password: 'password123',
        cn_name: '新用户',
        role: 'view',
        company_id: 1,
      };
      expect(req.username).toBe('newuser');
      expect(req.password).toBe('password123');
      expect(req.role).toBe('view');
    });

    it('should allow optional company_id to be null', () => {
      const req: CreateUserRequest = {
        username: 'sysadmin',
        password: 'pass',
        cn_name: '系统管理员',
        role: 'sysadmin',
        company_id: null,
      };
      expect(req.company_id).toBeNull();
    });

    it('should allow optional company_id to be undefined', () => {
      const req: CreateUserRequest = {
        username: 'test',
        password: 'pass',
        cn_name: '测试',
        role: 'admin',
      };
      expect(req.company_id).toBeUndefined();
    });
  });

  describe('UpdateUserRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateUserRequest = {
        cn_name: '新名称',
        role: 'admin',
        status: true,
        password: 'newpassword',
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
  });

  describe('re-exports from index', () => {
    it('should re-export LoginSelectionError class from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      // LoginSelectionError is a class (runtime value), so it exists at runtime
      expect(indexModule.LoginSelectionError).toBeDefined();
      expect(typeof indexModule.LoginSelectionError).toBe('function');
    });

    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      // If this file compiles and runs, all type imports from user.entity are valid
      const user: User = {
        id: 1, username: 'test', password_hash: 'hash', cn_name: '测试',
        role: 'admin', status: true, company_id: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(user.role).toBe('admin');
    });
  });
});
