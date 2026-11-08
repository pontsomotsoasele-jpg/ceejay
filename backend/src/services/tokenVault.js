const crypto = require('crypto');

function getKey() {
  const value = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal key.');
  }
  return Buffer.from(value, 'hex');
}

function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(value) {
  if (!value) return '';
  const [ivHex, tagHex, ciphertextHex] = value.split(':');
  if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Stored social account token is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
