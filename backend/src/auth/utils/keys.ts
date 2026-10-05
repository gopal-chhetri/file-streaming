import * as crypto from 'crypto';
import { existsSync, readFileSync } from 'fs';

let privateKey: string;
let publicKey: string;

/**
 * Accepts a PEM string, base64-encoded PEM, or a path to a PEM file.
 */
function resolveKey(value: string, marker: string): string {
  if (value.includes(marker)) return value;
  if (existsSync(value)) return readFileSync(value, 'utf-8');
  return Buffer.from(value, 'base64').toString('utf-8');
}

function initKeys() {
  if (privateKey && publicKey) return;

  // JWT_PRIVATE_KEY / JWT_PUBLIC_KEY hold the key (PEM or base64);
  // the *_PATH variants point at PEM files.
  const envPrivate = process.env.JWT_PRIVATE_KEY || process.env.JWT_PRIVATE_KEY_PATH;
  const envPublic = process.env.JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY_PATH;

  if (envPrivate && envPublic) {
    privateKey = resolveKey(envPrivate, '-----BEGIN PRIVATE KEY-----');
    publicKey = resolveKey(envPublic, '-----BEGIN PUBLIC KEY-----');
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    // validateProductionEnv() normally stops startup before this point.
    throw new Error('JWT signing keys are not configured');
  }

  const { privateKey: prKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKey = prKey;
  publicKey = pubKey;
  console.warn(
    '⚠️ JWT keys not set; generated a temporary RSA keypair. Tokens will stop working when the process restarts.',
  );
}

export function getPrivateKey(): string {
  initKeys();
  return privateKey;
}

export function getPublicKey(): string {
  initKeys();
  return publicKey;
}
