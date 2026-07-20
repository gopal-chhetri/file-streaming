import * as crypto from 'crypto';

let privateKey: string;
let publicKey: string;

function initKeys() {
  if (privateKey && publicKey) return;

  const envPrivate = process.env.JWT_PRIVATE_KEY;
  const envPublic = process.env.JWT_PUBLIC_KEY;

  if (envPrivate && envPublic) {
    privateKey = envPrivate.includes('-----BEGIN PRIVATE KEY-----')
      ? envPrivate
      : Buffer.from(envPrivate, 'base64').toString('utf-8');

    publicKey = envPublic.includes('-----BEGIN PUBLIC KEY-----')
      ? envPublic
      : Buffer.from(envPublic, 'base64').toString('utf-8');
  } else {
    const { privateKey: prKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = prKey;
    publicKey = pubKey;
    console.warn('⚠️ JWT_PRIVATE_KEY or JWT_PUBLIC_KEY not set. Dynamically generated a self-signed RSA keypair for development.');
  }
}

export function getPrivateKey(): string {
  initKeys();
  return privateKey;
}

export function getPublicKey(): string {
  initKeys();
  return publicKey;
}
