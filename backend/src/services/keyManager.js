const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config/config');

class KeyManager {
  constructor() {
    this._keyPair = null;
    this._keyId = null;
    this._jwk = null;
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;

    try {
      if (config.rsa && config.rsa.privateKey && config.rsa.publicKey) {
        this._keyPair = {
          privateKey: config.rsa.privateKey,
          publicKey: config.rsa.publicKey,
        };
        this._keyId = config.rsa.keyId || this._generateKeyId(config.rsa.publicKey);
        logger.info('RSA keys loaded from environment variables');
      } else {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        this._keyPair = { privateKey, publicKey };
        this._keyId = this._generateKeyId(publicKey);
        logger.warn('Generated ephemeral RSA key pair (development only)');
      }

      this._jwk = this._publicKeyToJwk(this._keyPair.publicKey);
      this._initialized = true;
      logger.info(`Key manager initialized with kid: ${this._keyId}`);
    } catch (error) {
      logger.error('Failed to initialize key manager:', error);
      throw error;
    }
  }

  get privateKey() {
    this._ensureInitialized();
    return this._keyPair.privateKey;
  }

  get publicKey() {
    this._ensureInitialized();
    return this._keyPair.publicKey;
  }

  get keyId() {
    this._ensureInitialized();
    return this._keyId;
  }

  getJwks() {
    this._ensureInitialized();
    return { keys: [this._jwk] };
  }

  _publicKeyToJwk(pem) {
    const keyObject = crypto.createPublicKey(pem);
    const exported = keyObject.export({ format: 'jwk' });
    return {
      kty: exported.kty,
      n: exported.n,
      e: exported.e,
      kid: this._keyId,
      alg: 'RS256',
      use: 'sig',
    };
  }

  _generateKeyId(publicKeyPem) {
    return crypto.createHash('sha256').update(publicKeyPem).digest('base64url').substring(0, 16);
  }

  _ensureInitialized() {
    if (!this._initialized) {
      throw new Error('KeyManager not initialized. Call initialize() first.');
    }
  }
}

module.exports = new KeyManager();
