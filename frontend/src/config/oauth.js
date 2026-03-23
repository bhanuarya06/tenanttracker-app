import API_BASE_URL from './api';

const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile'],
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  },
  github: {
    name: 'GitHub',
    authEndpoint: 'https://github.com/login/oauth/authorize',
    scopes: ['read:user', 'user:email'],
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
  },
};

const BFF_ENDPOINTS = {
  callback: (provider) => `${API_BASE_URL}/auth/oauth/${provider}/callback`,
};

const REDIRECT_URI = (provider) =>
  `${window.location.origin}/auth/callback/${provider}`;

export { OAUTH_PROVIDERS, BFF_ENDPOINTS, REDIRECT_URI };
