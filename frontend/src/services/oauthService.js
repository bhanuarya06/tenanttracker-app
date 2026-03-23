import { OAUTH_PROVIDERS, BFF_ENDPOINTS, REDIRECT_URI } from '../config/oauth';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
  storeOAuthParams,
  getOAuthParams,
  clearOAuthParams,
  validateState,
} from '../utils/security';
import apiClient from './apiClient';

/**
 * Initiates the OAuth flow: builds the authorization URL with PKCE
 * and stores the verifier/state/nonce in sessionStorage, then redirects.
 */
export async function initiateOAuthFlow(provider) {
  const providerConfig = OAUTH_PROVIDERS[provider];
  if (!providerConfig) throw new Error(`Unknown provider: ${provider}`);
  if (!providerConfig.clientId) throw new Error(`${providerConfig.name} OAuth is not configured`);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();
  const redirectUri = REDIRECT_URI(provider);

  storeOAuthParams(provider, { codeVerifier, state, nonce, redirectUri });

  const params = new URLSearchParams({
    client_id: providerConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: providerConfig.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  if (provider === 'google') {
    params.set('nonce', nonce);
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  window.location.href = `${providerConfig.authEndpoint}?${params.toString()}`;
}

/**
 * Handles the OAuth callback: validates state, exchanges the code
 * via BFF endpoint, and returns the auth result.
 */
export async function handleOAuthCallback(provider, code, returnedState) {
  if (!validateState(provider, returnedState)) {
    clearOAuthParams(provider);
    throw new Error('Invalid OAuth state — possible CSRF attack');
  }

  const params = getOAuthParams(provider);
  clearOAuthParams(provider);

  const { data } = await apiClient.post(
    BFF_ENDPOINTS.callback(provider),
    {
      code,
      code_verifier: params.codeVerifier,
      nonce: params.nonce,
      redirect_uri: params.redirectUri,
    }
  );

  return data;
}

/**
 * Returns list of configured provider names.
 */
export function getAvailableProviders() {
  return Object.entries(OAUTH_PROVIDERS)
    .filter(([, config]) => !!config.clientId)
    .map(([key]) => key);
}
