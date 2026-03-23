const request = require('supertest');
const app = require('../src/app');
const { User } = require('../src/models');
const keyManager = require('../src/services/keyManager');

const testUser = {
  firstName: 'Social',
  lastName: 'User',
  email: 'social@example.com',
  password: 'Social@1234',
  role: 'owner',
};

// Helper
async function registerAndLogin(userData = testUser) {
  const res = await request(app).post('/auth/register').send(userData);
  return { token: res.body.data.accessToken, user: res.body.data.user, cookies: res.headers['set-cookie'] };
}

describe('OAuth Auth Controller', () => {
  beforeAll(async () => {
    await keyManager.initialize();
  });

  // ─── POST /auth/oauth/:provider/callback ─────

  describe('POST /auth/oauth/:provider/callback', () => {
    it('should reject unsupported provider', async () => {
      const res = await request(app)
        .post('/auth/oauth/facebook/callback')
        .send({ code: 'test-code' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Unsupported/i);
    });

    it('should reject missing authorization code', async () => {
      const res = await request(app)
        .post('/auth/oauth/google/callback')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not configured|code is required/i);
    });

    it('should reject unconfigured provider (no client ID set)', async () => {
      const res = await request(app)
        .post('/auth/oauth/google/callback')
        .send({ code: 'test-code', state: 'test-state' });
      // Google is not configured (empty client ID in test env)
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not configured/i);
    });
  });

  // ─── GET /auth/me ────────────────────────────

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.firstName).toBe(testUser.firstName);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return oauthProviders array', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.data.user.oauthProviders).toBeInstanceOf(Array);
    });
  });

  // ─── POST /auth/token/refresh ────────────────

  describe('POST /auth/token/refresh', () => {
    it('should reject with no refresh token cookie', async () => {
      const res = await request(app).post('/auth/token/refresh');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/refresh token/i);
    });
  });

  // ─── POST /auth/token/revoke ─────────────────

  describe('POST /auth/token/revoke', () => {
    it('should succeed even without a token (idempotent)', async () => {
      const res = await request(app).post('/auth/token/revoke');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── DELETE /auth/oauth/:provider/unlink ──────

  describe('DELETE /auth/oauth/:provider/unlink', () => {
    it('should reject unsupported provider', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .delete('/auth/oauth/facebook/unlink')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Unsupported/i);
    });

    it('should reject if provider is not linked', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .delete('/auth/oauth/google/unlink')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not linked/i);
    });

    it('should unlink provider when user has password', async () => {
      // Register user with password, then manually add OAuth provider
      const { token } = await registerAndLogin();
      await User.updateOne(
        { email: testUser.email },
        {
          $push: {
            oauthProviders: {
              provider: 'github',
              providerId: 'github-12345',
              email: testUser.email,
              displayName: 'Social User',
              linkedAt: new Date(),
            },
          },
        }
      );

      const res = await request(app)
        .delete('/auth/oauth/github/unlink')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.oauthProviders).toHaveLength(0);
    });

    it('should prevent unlinking sole login method', async () => {
      // Create OAuth-only user (no password)
      const oauthUser = await User.create({
        firstName: 'NoPass',
        lastName: 'User',
        email: 'nopass@example.com',
        role: 'owner',
        isActive: true,
        oauthProviders: [{
          provider: 'google',
          providerId: 'google-999',
          email: 'nopass@example.com',
          displayName: 'No Password User',
          linkedAt: new Date(),
        }],
      });

      // Get a token for this user (register a normal user and impersonate via direct token)
      const tokenService = require('../src/services/tokenService');
      const accessToken = tokenService.generateAccessToken(oauthUser);

      const res = await request(app)
        .delete('/auth/oauth/google/unlink')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only login method|Set a password first/i);
    });

    it('should require authentication', async () => {
      const res = await request(app).delete('/auth/oauth/google/unlink');
      expect(res.status).toBe(401);
    });
  });
});
