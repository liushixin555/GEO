import { getApiErrorMessage } from '../../../pages/utils/error';

describe('getApiErrorMessage', () => {
  it('应返回 fallback 当 err 不是 response 对象', () => {
    expect(getApiErrorMessage(null, '操作失败')).toBe('操作失败');
    expect(getApiErrorMessage(undefined, '操作失败')).toBe('操作失败');
    expect(getApiErrorMessage('string error', '操作失败')).toBe('操作失败');
  });

  it('应返回服务端消息当 4xx 错误', () => {
    const err = { response: { status: 400, data: { message: '参数错误' } } };
    expect(getApiErrorMessage(err, '操作失败')).toBe('参数错误');
  });

  it('应返回服务端消息当 404 错误', () => {
    const err = { response: { status: 404, data: { message: '资源不存在' } } };
    expect(getApiErrorMessage(err, '操作失败')).toBe('资源不存在');
  });

  it('应返回 fallback 当 5xx 错误（脱敏）', () => {
    const err = { response: { status: 500, data: { message: 'Prisma internal error...' } } };
    expect(getApiErrorMessage(err, '操作失败')).toBe('操作失败');
  });

  it('应返回 fallback 当 response 无 message', () => {
    const err = { response: { status: 400, data: {} } };
    expect(getApiErrorMessage(err, '操作失败')).toBe('操作失败');
  });

  it('应返回 fallback 当 response.data 为空', () => {
    const err = { response: { status: 422 } };
    expect(getApiErrorMessage(err, '操作失败')).toBe('操作失败');
  });
});
