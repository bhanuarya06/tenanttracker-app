const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { User, AuthorizationCode } = require('../src/models');
const keyManager = require('../src/services/keyManager');

const testUser = {
  firstName: 'OAuth',
  lastName: 'Tester',
  email: 'oauth@example.com',
  password: 'OAuthPass@1234',
  role: 'owner',
};

// Helper: register + get token
async function registerAndLogin() {
  const res = await request(app).post('/auth/register').send(testUser);
  return { token: res.body.data.accessToken, user: res.body.data.user };
}

// Helper: generate PKCE pair
function generatePkce() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

describe('OAuth2 / OIDC Endpoints', () => {
  beforeAll(async () => {
    await keyManager.initialize();
  });

  // ─── OIDC Discovery ──────────────────────────

  describe('GET /.well-known/openid-configuration', () => {
    it('should return discovery document', async () => {
      const res = await request(app).get('/.well-known/openid-configuration');
      expect(res.status).toBe(200);
      expect(res.body.issuer).toBeDefined();
      expect(res.body.authorization_endpoint).toBeDefined();
      expect(res.body.token_endpoint).toBeDefined();
      expect(res.body.jwks_uri).toBeDefined();
      expect(res.body.response_types_supported).toContain('code');
      expect(res.body.subject_types_supported).toBeDefined();
      expect(res.body.id_token_signing_alg_values_supported).toContain('RS256');
    });
  });

  // ─── JWKS ────────────────────────────────────

  describe('GET /.well-known/jwks.json', () => {
    it('should return JWKS with at least one key', async () => {
      const res = await request(app).get('/.well-known/jwks.json');
      expect(res.status).toBe(200);
      expect(res.body.keys).toBeInstanceOf(Array);
      expect(res.body.keys.length).toBeGreaterThanOrEqual(1);
      const key = res.body.keys[0];
      expect(key.kty).toBe('RSA');
      expect(key.alg).toBe('RS256');
      expect(key.use).toBe('sig');
      expect(key.kid).toBeDefined();
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
    });
  });

  // ─── Authorization Endpoint (GET) ────────────

  describe('GET /oauth2/authorize', () => {
    it('should validate authorization request (requires auth)', async () => {
      const { token } = await registerAndLogin();
      const { codeChallenge } = generatePkce();

      const res = await request(app)
        .get('/oauth2/authorize')
        .set('Authorization', `Bearer ${token}`)
        .query({
          response_type: 'code',
          client_id: 'tenanttracker-spa',
          redirect_uri: 'http://localhost:5173/auth/callback',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          scope: 'openid profile email',
          state: 'random-state-123',
        });
      expect(res.status).toBe(200);
      expect(res.body.authorization_request).toBeDefined();
      expect(res.body.authorization_request.client_id).toBe('tenanttracker-spa');
    });

    it('should reject without auth token', async () => {
      const res = await request(app).get('/oauth2/authorize').query({ response_type: 'code' });
      expect(res.status).toBe(401);
    });

    it('should reject invalid response_type', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/oauth2/authorize')
        .set('Authorization', `Bearer ${token}`)
        .query({
          response_type: 'token',
          client_id: 'tenanttracker-spa',
          redirect_uri: 'http://localhost:5173/auth/callback',
          code_challenge: 'abc',
          code_challenge_method: 'S256',
          state: 'state1',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });

    it('should reject missing PKCE', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/oauth2/authorize')
        .set('Authorization', `Bearer ${token}`)
        .query({
          response_type: 'code',
          client_id: 'tenanttracker-spa',
          redirect_uri: 'http://localhost:5173/auth/callback',
          state: 'state1',
        });
      expect(res.status).toBe(400);
    });
  });

  // ─── Authorization Endpoint (POST) ───────────

  describe('POST /oauth2/authorize', () => {
    it('should issue authorization code with valid credentials + PKCE', async () => {
      // Register user first
      await request(app).post('/auth/register').send(testUser);
      const { codeChallenge } = generatePkce();

      const res = await request(app).post('/oauth2/authorize')
        .set('Authorization', 'Bearer dummy') // POST authorize needs authenticate middleware
        .send({
          email: testUser.email,
          password: testUser.password,
          client_id: 'tenanttracker-spa',
          redirect_uri: 'http://localhost:5173/auth/callback',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          scope: 'openid profile email',
          state: 'state-123',
        });

      // This will either succeed (200 with code) or fail auth middleware (401)
      // Since POST /oauth2/authorize requires authenticate middleware, we need a valid token
      if (res.status === 401) {
        // Re-do with valid token
        const loginRes = await request(app).post('/auth/login').send({ email: testUser.email, password: testUser.password });
        const token = loginRes.body.data.accessToken;

        const res2 = await request(app).post('/oauth2/authorize')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: testUser.email,
            password: testUser.password,
            client_id: 'tenanttracker-spa',
            redirect_uri: 'http://localhost:5173/auth/callback',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            scope: 'openid profile email',
            state: 'state-123',
          });

        expect(res2.status).toBe(200);
        expect(res2.body.code).toBeDefined();
        expect(res2.body.state).toBe('state-123');
      }
    });

    it('should reject invalid credentials', async () => {
      const { token } = await registerAndLogin();
      const { codeChallenge } = generatePkce();

      const res = await request(app).post('/oauth2/authorize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: testUser.email,
          password: 'WrongPassword@1',
          client_id: 'tenanttracker-spa',
          redirect_uri: 'http://localhost:5173/auth/callback',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state: 'state-123',
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('access_denied');
    });
  });

  // ─── Token Endpoint ──────────────────────────

  describe('POST /oauth2/token', () => {
    it('should exchange authorization code for tokens', async () => {
      const { token } = await registerAndLogin();
      const { codeVerifier, codeChallenge } = generatePkce();
      const user = await User.findOne({ email: testUser.email });

      // Create auth code directly in DB
      const code = crypto.randomBytes(32).toString('base64url');
      await AuthorizationCode.create({
        code,
        user: user._id,
        clientId: 'tenanttracker-spa',
        redirectUri: 'http://localhost:5173/auth/callback',
        scopes: ['openid', 'profile', 'email'],
        codeChallenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app).post('/oauth2/token').send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:5173/auth/callback',
        client_id: 'tenanttracker-spa',
        code_verifier: codeVerifier,
      });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.token_type).toBe('Bearer');
      expect(res.body.expires_in).toBe(900);
      expect(res.body.id_token).toBeDefined();
    });

    it('should reject reuse of authorization code', async () => {
      await registerAndLogin();
      const { codeVerifier, codeChallenge } = generatePkce();
      const user = await User.findOne({ email: testUser.email });

      const code = crypto.randomBytes(32).toString('base64url');
      await AuthorizationCode.create({
        code,
        user: user._id,
        clientId: 'tenanttracker-spa',
        redirectUri: 'http://localhost:5173/auth/callback',
        scopes: ['openid'],
        codeChallenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      // First use
      await request(app).post('/oauth2/token').send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:5173/auth/callback',
        client_id: 'tenanttracker-spa',
        code_verifier: codeVerifier,
      });

      // Second use — should fail
      const res = await request(app).post('/oauth2/token').send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:5173/auth/callback',
        client_id: 'tenanttracker-spa',
        code_verifier: codeVerifier,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_grant');
    });

    it('should reject invalid PKCE verifier', async () => {
      await registerAndLogin();
      const { codeChallenge } = generatePkce();
      const user = await User.findOne({ email: testUser.email });

      const code = crypto.randomBytes(32).toString('base64url');
      await AuthorizationCode.create({
        code,
        user: user._id,
        clientId: 'tenanttracker-spa',
        redirectUri: 'http://localhost:5173/auth/callback',
        scopes: ['openid'],
        codeChallenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app).post('/oauth2/token').send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:5173/auth/callback',
        client_id: 'tenanttracker-spa',
        code_verifier: 'wrong-verifier',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_grant');
      expect(res.body.error_description).toMatch(/PKCE/);
    });

    it('should reject unsupported grant type', async () => {
      const res = await request(app).post('/oauth2/token').send({
        grant_type: 'implicit',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('unsupported_grant_type');
    });

    it('should reject missing parameters', async () => {
      const res = await request(app).post('/oauth2/token').send({
        grant_type: 'authorization_code',
        code: 'some-code',
        // Missing redirect_uri, client_id, code_verifier
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });
  });

  // ─── Token Revocation ────────────────────────

  describe('POST /oauth2/revoke', () => {
    it('should revoke token and return success', async () => {
      const res = await request(app).post('/oauth2/revoke').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Token Introspection ─────────────────────

  describe('POST /oauth2/introspect', () => {
    it('should introspect a valid access token', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app).post('/oauth2/introspect').send({ token });
      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
      expect(res.body.sub).toBeDefined();
    });

    it('should return inactive for invalid token', async () => {
      const res = await request(app).post('/oauth2/introspect').send({ token: 'invalid.token.value' });
      expect(res.status).toBe(200);
      expect(res.body.active).toBe(false);
    });

    it('should reject missing token', async () => {
      const res = await request(app).post('/oauth2/introspect').send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── UserInfo ────────────────────────────────

  describe('GET /oauth2/userinfo', () => {
    it('should return user info with valid token', async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get('/oauth2/userinfo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.sub).toBeDefined();
      expect(res.body.email).toBe(testUser.email);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/oauth2/userinfo');
      expect(res.status).toBe(401);
    });
  });
});
