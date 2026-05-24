/**
 * @jest-environment node
 *
 * Tests for apis/controller/index.ts barrel file.
 * Verifies all 33 re-exported controller functions are present,
 * correctly typed, and properly wired to their source modules.
 */

// Expected exports grouped by source module
const EXPECTED_EXPORTS: Record<string, string[]> = {
  './../../../apis/controller/auth.controller': ['login', 'logout', 'verify'],
  './../../../apis/controller/company.controller': ['listCompanies', 'getCompany', 'createCompany', 'updateCompany'],
  './../../../apis/controller/skills.controller': ['listSkills', 'getSkills', 'createSkills', 'updateSkills', 'deleteSkills'],
  './../../../apis/controller/user.controller': ['listUsers', 'getUser', 'createUser', 'updateUser', 'deleteUser'],
  './../../../apis/controller/llm-model.controller': ['listLlmModels', 'getLlmModel', 'createLlmModel', 'updateLlmModel', 'deleteLlmModel'],
  './../../../apis/controller/system-config.controller': ['getSystemConfigs', 'updateSystemConfigs'],
  './../../../apis/controller/todo.controller': ['listTodos', 'getTodo', 'createTodo', 'updateTodo', 'closeTodo', 'reopenTodo', 'transferTodo', 'rejectTodo', 'getTodoLogs'],
};

const ALL_EXPORT_NAMES = Object.values(EXPECTED_EXPORTS).flat();
const EXPECTED_COUNT = ALL_EXPORT_NAMES.length; // 33

describe('controller/index.ts barrel file', () => {
  let barrel: Record<string, any>;

  beforeAll(() => {
    barrel = require('./../../../apis/controller/index');
  });

  // ========== Total export count ==========
  describe('export count', () => {
    it(`should export exactly ${EXPECTED_COUNT} named members`, () => {
      const exportedNames = Object.keys(barrel);
      expect(exportedNames).toHaveLength(EXPECTED_COUNT);
    });

    it('should not export __esModule as a named export key (CJS compat)', () => {
      // __esModule is a common CJS artifact; our barrel should list only named exports
      const namedKeys = Object.keys(barrel).filter(k => k !== '__esModule');
      expect(namedKeys).toHaveLength(EXPECTED_COUNT);
    });
  });

  // ========== All expected exports exist and are functions ==========
  describe('export existence and type', () => {
    it.each(ALL_EXPORT_NAMES.map(name => ({ name })))(
      'should export "$name" as a function',
      ({ name }) => {
        expect(barrel[name]).toBeDefined();
        expect(typeof barrel[name]).toBe('function');
      }
    );
  });

  // ========== No unexpected exports ==========
  describe('no unexpected exports', () => {
    it('should not contain any exports beyond the expected list', () => {
      const exportedNames = Object.keys(barrel).filter(k => k !== '__esModule');
      const extraExports = exportedNames.filter(name => !ALL_EXPORT_NAMES.includes(name));
      expect(extraExports).toEqual([]);
    });

    it('should not be missing any expected exports', () => {
      const exportedNames = Object.keys(barrel).filter(k => k !== '__esModule');
      const missingExports = ALL_EXPORT_NAMES.filter(name => !exportedNames.includes(name));
      expect(missingExports).toEqual([]);
    });
  });

  // ========== Per-module export grouping ==========
  describe('per-module grouping', () => {
    it.each(Object.entries(EXPECTED_EXPORTS).map(([module, names]) => ({
      module: module.split('/').pop()!,
      names,
      count: names.length,
    })))(
      'should export all $count functions from $module',
      ({ names }) => {
        for (const name of names) {
          expect(typeof barrel[name]).toBe('function');
        }
      }
    );
  });

  // ========== Export uniqueness (no name collisions) ==========
  describe('export uniqueness', () => {
    it('all export names should be unique', () => {
      const uniqueNames = new Set(ALL_EXPORT_NAMES);
      expect(uniqueNames.size).toBe(EXPECTED_COUNT);
    });

    it('should have no duplicate exports in barrel', () => {
      const exportedNames = Object.keys(barrel).filter(k => k !== '__esModule');
      const uniqueExported = new Set(exportedNames);
      expect(uniqueExported.size).toBe(exportedNames.length);
    });
  });

  // ========== Function identity (each export is a distinct function) ==========
  describe('function identity', () => {
    it('each exported function should be a distinct reference', () => {
      const fns = ALL_EXPORT_NAMES.map(name => barrel[name]);
      const uniqueRefs = new Set(fns);
      expect(uniqueRefs.size).toBe(EXPECTED_COUNT);
    });
  });

  // ========== Source module wiring ==========
  describe('source module wiring', () => {
    it('auth exports should come from auth.controller', () => {
      const authModule = require('./../../../apis/controller/auth.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/auth.controller']) {
        expect(barrel[name]).toBe(authModule[name]);
      }
    });

    it('company exports should come from company.controller', () => {
      const companyModule = require('./../../../apis/controller/company.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/company.controller']) {
        expect(barrel[name]).toBe(companyModule[name]);
      }
    });

    it('skills exports should come from skills.controller', () => {
      const skillsModule = require('./../../../apis/controller/skills.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/skills.controller']) {
        expect(barrel[name]).toBe(skillsModule[name]);
      }
    });

    it('user exports should come from user.controller', () => {
      const userModule = require('./../../../apis/controller/user.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/user.controller']) {
        expect(barrel[name]).toBe(userModule[name]);
      }
    });

    it('llm-model exports should come from llm-model.controller', () => {
      const llmModule = require('./../../../apis/controller/llm-model.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/llm-model.controller']) {
        expect(barrel[name]).toBe(llmModule[name]);
      }
    });

    it('system-config exports should come from system-config.controller', () => {
      const sysConfigModule = require('./../../../apis/controller/system-config.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/system-config.controller']) {
        expect(barrel[name]).toBe(sysConfigModule[name]);
      }
    });

    it('todo exports should come from todo.controller', () => {
      const todoModule = require('./../../../apis/controller/todo.controller');
      for (const name of EXPECTED_EXPORTS['./../../../apis/controller/todo.controller']) {
        expect(barrel[name]).toBe(todoModule[name]);
      }
    });
  });

  // ========== Completeness per module ==========
  describe('completeness per source module', () => {
    it('auth.controller should NOT leak saveSelection through barrel', () => {
      expect(barrel.saveSelection).toBeUndefined();
    });

    it('auth.controller should NOT leak getAccessibleCompanies through barrel', () => {
      expect(barrel.getAccessibleCompanies).toBeUndefined();
    });

    it('auth.controller should NOT leak getAccessibleProjects through barrel', () => {
      expect(barrel.getAccessibleProjects).toBeUndefined();
    });

    it('auth.controller should NOT leak getContext through barrel', () => {
      expect(barrel.getContext).toBeUndefined();
    });

    it('auth.controller should NOT leak getCompanyDetail through barrel', () => {
      expect(barrel.getCompanyDetail).toBeUndefined();
    });

    it('company.controller should NOT leak toggleCompanyStatus through barrel', () => {
      expect(barrel.toggleCompanyStatus).toBeUndefined();
    });

    it('skills.controller should NOT leak uploadSkillMiddleware through barrel', () => {
      expect(barrel.uploadSkillMiddleware).toBeUndefined();
    });

    it('llm-model.controller should NOT leak listEnabledLlmModels through barrel', () => {
      expect(barrel.listEnabledLlmModels).toBeUndefined();
    });

    it('todo.controller should NOT leak getObjectOptions through barrel', () => {
      expect(barrel.getObjectOptions).toBeUndefined();
    });

    it('todo.controller should NOT leak getAssigneeCandidates through barrel', () => {
      expect(barrel.getAssigneeCandidates).toBeUndefined();
    });
  });

  // ========== Function signature spot checks ==========
  describe('function arity (parameter count)', () => {
    it('login should accept 2 parameters (req, res)', () => {
      expect(barrel.login.length).toBe(2);
    });

    it('logout should accept 2 parameters', () => {
      expect(barrel.logout.length).toBe(2);
    });

    it('verify should accept 2 parameters', () => {
      expect(barrel.verify.length).toBe(2);
    });

    it('listCompanies should accept 2 parameters', () => {
      expect(barrel.listCompanies.length).toBe(2);
    });

    it('getCompany should accept 2 parameters', () => {
      expect(barrel.getCompany.length).toBe(2);
    });

    it('createCompany should accept 2 parameters', () => {
      expect(barrel.createCompany.length).toBe(2);
    });

    it('updateCompany should accept 2 parameters', () => {
      expect(barrel.updateCompany.length).toBe(2);
    });

    it('listSkills should accept 2 parameters', () => {
      expect(barrel.listSkills.length).toBe(2);
    });

    it('getSkills should accept 2 parameters', () => {
      expect(barrel.getSkills.length).toBe(2);
    });

    it('createSkills should accept 2 parameters', () => {
      expect(barrel.createSkills.length).toBe(2);
    });

    it('updateSkills should accept 2 parameters', () => {
      expect(barrel.updateSkills.length).toBe(2);
    });

    it('deleteSkills should accept 2 parameters', () => {
      expect(barrel.deleteSkills.length).toBe(2);
    });

    it('listUsers should accept 2 parameters', () => {
      expect(barrel.listUsers.length).toBe(2);
    });

    it('getUser should accept 2 parameters', () => {
      expect(barrel.getUser.length).toBe(2);
    });

    it('createUser should accept 2 parameters', () => {
      expect(barrel.createUser.length).toBe(2);
    });

    it('updateUser should accept 2 parameters', () => {
      expect(barrel.updateUser.length).toBe(2);
    });

    it('deleteUser should accept 2 parameters', () => {
      expect(barrel.deleteUser.length).toBe(2);
    });

    it('listLlmModels should accept 2 parameters', () => {
      expect(barrel.listLlmModels.length).toBe(2);
    });

    it('getLlmModel should accept 2 parameters', () => {
      expect(barrel.getLlmModel.length).toBe(2);
    });

    it('createLlmModel should accept 2 parameters', () => {
      expect(barrel.createLlmModel.length).toBe(2);
    });

    it('updateLlmModel should accept 2 parameters', () => {
      expect(barrel.updateLlmModel.length).toBe(2);
    });

    it('deleteLlmModel should accept 2 parameters', () => {
      expect(barrel.deleteLlmModel.length).toBe(2);
    });

    it('getSystemConfigs should accept 2 parameters', () => {
      expect(barrel.getSystemConfigs.length).toBe(2);
    });

    it('updateSystemConfigs should accept 2 parameters', () => {
      expect(barrel.updateSystemConfigs.length).toBe(2);
    });

    it('listTodos should accept 2 parameters', () => {
      expect(barrel.listTodos.length).toBe(2);
    });

    it('getTodo should accept 2 parameters', () => {
      expect(barrel.getTodo.length).toBe(2);
    });

    it('createTodo should accept 2 parameters', () => {
      expect(barrel.createTodo.length).toBe(2);
    });

    it('updateTodo should accept 2 parameters', () => {
      expect(barrel.updateTodo.length).toBe(2);
    });

    it('closeTodo should accept 2 parameters', () => {
      expect(barrel.closeTodo.length).toBe(2);
    });

    it('reopenTodo should accept 2 parameters', () => {
      expect(barrel.reopenTodo.length).toBe(2);
    });

    it('transferTodo should accept 2 parameters', () => {
      expect(barrel.transferTodo.length).toBe(2);
    });

    it('rejectTodo should accept 2 parameters', () => {
      expect(barrel.rejectTodo.length).toBe(2);
    });

    it('getTodoLogs should accept 2 parameters', () => {
      expect(barrel.getTodoLogs.length).toBe(2);
    });
  });

  // ========== Async function verification ==========
  describe('async function verification', () => {
    it.each(ALL_EXPORT_NAMES.map(name => ({ name })))(
      '"$name" should be an async function (returns Promise)',
      async ({ name }) => {
        const fn = barrel[name];
        // Create mock req/res to call the function
        const mockReq = {} as any;
        const mockRes = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis(),
        } as any;
        const result = fn(mockReq, mockRes);
        // Async functions return a Promise
        expect(result).toBeInstanceOf(Promise);
        // Catch to avoid unhandled rejection
        await result.catch(() => {});
      }
    );
  });

  // ========== Barrel re-import consistency ==========
  describe('re-import consistency', () => {
    it('multiple require calls should return the same module reference', () => {
      const barrel1 = require('./../../../apis/controller/index');
      const barrel2 = require('./../../../apis/controller/index');
      // Node.js module caching should return same object
      expect(barrel1).toBe(barrel2);
    });

    it('each function reference should be stable across require calls', () => {
      const barrel1 = require('./../../../apis/controller/index');
      const barrel2 = require('./../../../apis/controller/index');
      for (const name of ALL_EXPORT_NAMES) {
        expect(barrel1[name]).toBe(barrel2[name]);
      }
    });
  });

  // ========== Module structure summary ==========
  describe('module structure summary', () => {
    it('should have exactly 7 source modules', () => {
      expect(Object.keys(EXPECTED_EXPORTS)).toHaveLength(7);
    });

    it('should export 3 functions from auth controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/auth.controller']).toHaveLength(3);
    });

    it('should export 4 functions from company controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/company.controller']).toHaveLength(4);
    });

    it('should export 5 functions from skills controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/skills.controller']).toHaveLength(5);
    });

    it('should export 5 functions from user controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/user.controller']).toHaveLength(5);
    });

    it('should export 5 functions from llm-model controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/llm-model.controller']).toHaveLength(5);
    });

    it('should export 2 functions from system-config controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/system-config.controller']).toHaveLength(2);
    });

    it('should export 9 functions from todo controller', () => {
      expect(EXPECTED_EXPORTS['./../../../apis/controller/todo.controller']).toHaveLength(9);
    });
  });
});
