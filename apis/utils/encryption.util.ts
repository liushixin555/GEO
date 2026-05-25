import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_ENV = 'API_KEY_ENCRYPTION_KEY';

function getKey(): Buffer {
  const secret = process.env[ENCRYPTION_KEY_ENV];
  if (!secret) {
    throw new Error(`环境变量 ${ENCRYPTION_KEY_ENV} 未配置`);
  }
  return scryptSync(secret, 'by_geo_salt', 32);
}

/**
 * AES-256-GCM 加密 API Key
 * 返回格式：iv:authTag:ciphertext（均为 hex 编码）
 */
export function encryptApiKey(plainText: string): string {
  const iv = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM 解密 API Key
 */
export function decryptApiKey(encrypted: string): string {
  const [ivHex, authTagHex, data] = encrypted.split(':');
  if (!ivHex || !authTagHex || !data) {
    throw new Error('加密数据格式不合法');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 判断字符串是否为加密格式（iv:authTag:ciphertext）
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}
