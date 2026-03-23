import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
  storeOAuthParams,
  getOAuthParams,
  clearOAuthParams,
  validateState,
} from '../../utils/security';

describe('PKCE Security Utils', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('generateCodeVerifier', () => {
    it('should return a string', () => {
      const verifier = generateCodeVerifier();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    it('should generate unique verifiers', () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should return a base64url-encoded SHA-256 hash', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
      // Base64url should not contain +, /, or =
      expect(challenge).not.toMatch(/[+/=]/);
    });

    it('should produce different challenges for different verifiers', async () => {
      const c1 = await generateCodeChallenge('verifier-one');
      const c2 = await generateCodeChallenge('verifier-two');
      expect(c1).not.toBe(c2);
    });

    it('should produce consistent challenge for same verifier', async () => {
      const verifier = 'same-verifier';
      const c1 = await generateCodeChallenge(verifier);
      const c2 = await generateCodeChallenge(verifier);
      expect(c1).toBe(c2);
    });
  });

  describe('generateState', () => {
    it('should return a string', () => {
      expect(typeof generateState()).toBe('string');
    });

    it('should generate unique states', () => {
      expect(generateState()).not.toBe(generateState());
    });
  });

  describe('generateNonce', () => {
    it('should return a string', () => {
      expect(typeof generateNonce()).toBe('string');
    });

    it('should generate unique nonces', () => {
      expect(generateNonce()).not.toBe(generateNonce());
    });
  });

  describe('sessionStorage helpers', () => {
    it('should store and retrieve OAuth params', () => {
      const params = { codeVerifier: 'v1', state: 's1', nonce: 'n1', redirectUri: 'http://localhost' };
      storeOAuthParams('google', params);
      const retrieved = getOAuthParams('google');
      expect(retrieved).toEqual(params);
    });

    it('should return null for non-existent params', () => {
      expect(getOAuthParams('github')).toBeNull();
    });

    it('should clear params', () => {
      storeOAuthParams('google', { state: 's1' });
      clearOAuthParams('google');
      expect(getOAuthParams('google')).toBeNull();
    });

    it('should validate state correctly', () => {
      storeOAuthParams('google', { state: 'correct-state' });
      expect(validateState('google', 'correct-state')).toBe(true);
      expect(validateState('google', 'wrong-state')).toBe(false);
    });

    it('should return false for validate when no params stored', () => {
      expect(validateState('github', 'any-state')).toBeFalsy();
    });
  });
});
