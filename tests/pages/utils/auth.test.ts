import { getSafeUser } from '../../../pages/utils/auth';

describe('getSafeUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('应返回默认值当 localStorage 中无 user', () => {
    const user = getSafeUser();
    expect(user).toEqual({ id: 0, role: 'view' });
  });

  it('应返回默认值当 JSON 解析失败', () => {
    localStorage.setItem('user', 'invalid-json');
    const user = getSafeUser();
    expect(user).toEqual({ id: 0, role: 'view' });
  });

  it('应返回默认值当 JSON 中无有效字段', () => {
    localStorage.setItem('user', '{}');
    const user = getSafeUser();
    expect(user).toEqual({ id: 0, role: 'view' });
  });

  it('应返回校验后的有效用户对象', () => {
    localStorage.setItem('user', JSON.stringify({ id: 42, role: 'sysadmin', username: 'admin' }));
    const user = getSafeUser();
    expect(user).toEqual({ id: 42, role: 'sysadmin', username: 'admin' });
  });

  it('应将无效角色降级为 view', () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'superadmin' }));
    const user = getSafeUser();
    expect(user).toEqual({ id: 1, role: 'view' });
  });

  it('应将非数字 id 降级为 0', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'abc', role: 'admin' }));
    const user = getSafeUser();
    expect(user).toEqual({ id: 0, role: 'admin' });
  });

  it('应支持所有合法角色', () => {
    for (const role of ['sysadmin', 'admin', 'view']) {
      localStorage.setItem('user', JSON.stringify({ id: 1, role }));
      expect(getSafeUser().role).toBe(role);
    }
  });
});
