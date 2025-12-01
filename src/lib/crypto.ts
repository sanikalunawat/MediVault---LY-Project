'use server';

interface EncryptedBlob {
  ciphertext: string; // base64
  iv: string; // base64
  alg: 'aes-256-gcm';
  v: number;
}

const ALGORITHM = 'aes-256-gcm' as const;
const VERSION = 1;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = Buffer.from(b64, 'base64');
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
  return Buffer.from(ab as any).toString('base64');
}

async function getCryptoKey(): Promise<CryptoKey> {
  const keyB64 = process.env.ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error('ENCRYPTION_KEY env var is required (base64-encoded 32 bytes).');
  }
  const raw = Buffer.from(keyB64, 'base64');
  if (raw.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes for AES-256-GCM.');
  }
  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptObject(data: unknown): Promise<EncryptedBlob> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    alg: ALGORITHM,
    v: VERSION,
  };
}

export async function decryptObject<T = unknown>(blob: EncryptedBlob): Promise<T> {
  if (!blob || blob.alg !== ALGORITHM) {
    throw new Error('Unsupported or missing encryption algorithm.');
  }
  const key = await getCryptoKey();
  const iv = new Uint8Array(base64ToArrayBuffer(blob.iv));
  const ciphertext = base64ToArrayBuffer(blob.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export type { EncryptedBlob };


