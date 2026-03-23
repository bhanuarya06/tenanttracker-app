const config = require('../config/config');

class OidcService {
  getDiscoveryDocument() {
    const issuer = config.oidc.issuer;

    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      introspection_endpoint: `${issuer}/oauth/introspect`,
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      response_types_supported: ['code'],
      response_modes_supported: ['query', 'fragment'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      claims_supported: [
        'sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'nonce',
        'at_hash', 'name', 'given_name', 'family_name', 'email',
        'email_verified', 'picture', 'gender', 'birthdate', 'updated_at',
      ],
    };
  }

  getUserInfoClaims(user, scopes = []) {
    const claims = { sub: user._id.toString() };

    if (scopes.includes('profile')) {
      claims.name = `${user.firstName} ${user.lastName || ''}`.trim();
      claims.given_name = user.firstName;
      if (user.lastName) claims.family_name = user.lastName;
      if (user.avatar) claims.picture = user.avatar;
      if (user.gender) claims.gender = user.gender;
      if (user.dateOfBirth) claims.birthdate = user.dateOfBirth.toISOString().split('T')[0];
      claims.updated_at = Math.floor(new Date(user.updatedAt).getTime() / 1000);
    }

    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = user.isEmailVerified || false;
    }

    return claims;
  }
}

module.exports = new OidcService();
