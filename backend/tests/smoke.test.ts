import request from 'supertest';
import { app } from '../src/app';

describe('Smoke Tests', () => {
  it('GET /api should return ok', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('POST /api/auth/login returns 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '123456' });
    expect(res.status).toBe(422);
  });

  it('POST /api/auth/login returns 422 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });
    expect(res.status).toBe(422);
  });

  it('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/products without token returns 401', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });
});