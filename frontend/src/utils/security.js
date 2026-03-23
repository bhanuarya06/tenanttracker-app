/**
 * PKCE + OAuth security helpers.
 * Uses sessionStorage so state is tab-scoped and short-lived.
 */

function _randomBytes(length) {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

function _base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier() {
  return _base64UrlEncode(_randomBytes(32));
}

export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return _base64UrlEncode(digest);
}

export function generateState() {
  return _base64UrlEncode(_randomBytes(16));
}

export function generateNonce() {
  return _base64UrlEncode(_randomBytes(16));
}

// ─── Session storage helpers (tab-scoped, auto-cleared) ───

const STORAGE_PREFIX = 'oauth_';

export function storeOAuthParams(provider, params) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${provider}`, JSON.stringify(params));
}

export function getOAuthParams(provider) {
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${provider}`);
  return raw ? JSON.parse(raw) : null;
}

export function clearOAuthParams(provider) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
}

export function validateState(provider, returnedState) {
  const params = getOAuthParams(provider);
  return params?.state === returnedState;
}
