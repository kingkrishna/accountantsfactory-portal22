const request = require('supertest');

jest.mock('file-type', () => ({
  fromBuffer: jest.fn().mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' }),
}));

const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 and status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('message');
  });
});
