const request = require('supertest');

jest.mock('file-type', () => ({
  fromBuffer: jest.fn().mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' }),
}));

const app = require('../src/app');

describe('POST /api/auth/login', () => {
  it('returns 400 when email and password are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'Demo@123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 and token for demo admin login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'Demo@123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.email).toBe('admin@demo.com');
  });

  it('returns 200 and token for demo client login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@demo.com', password: 'Demo@123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('client');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
