const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'Test@1234',
  role: 'owner',
};

describe('Auth Endpoints', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/auth/register').send(testUser);
      const res = await request(app).post('/auth/register').send(testUser);
      expect(res.status).toBe(409);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ ...testUser, email: 'weak@example.com', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(testUser);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPass1!' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'Test@1234' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return profile with valid token', async () => {
      const reg = await request(app).post('/auth/register').send(testUser);
      const token = reg.body.data.accessToken;

      const res = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /auth/change-password', () => {
    it('should change password', async () => {
      const reg = await request(app).post('/auth/register').send(testUser);
      const token = reg.body.data.accessToken;

      const res = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: testUser.password, newPassword: 'NewPass@1234', confirmPassword: 'NewPass@1234' });
      expect(res.status).toBe(200);
    });
  });
});
