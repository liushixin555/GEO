/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

describe('POST /api/auth/logout', () => {
  it('should return 401 when no token provided', async () => {
    const response = await agent.post('/api/auth/logout');

    expect(response.status).toBe(401);
  });

  it('should return success when valid token provided', async () => {
    const token = jwt.sign(
      { userId: 1, username: 'admin', role: 'admin', companyId: 1 },
      'test-secret',
      { expiresIn: '2h' }
    );

    const response = await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.message).toBe('登出成功');
  });
});
