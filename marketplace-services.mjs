import { randomBytes, createHash } from 'node:crypto';

export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export function makeRecoveryToken() { const token = randomBytes(32).toString('hex'); return { token, hash: tokenHash(token), expiresAt: new Date(Date.now() + 30 * 60000).toISOString() }; }

// A provider-independent HTTPS mail gateway keeps credentials on the server.
export async function deliverEmail(message) {
  const endpoint = process.env.MAIL_GATEWAY_URL;
  if (!endpoint || !process.env.MAIL_GATEWAY_TOKEN || !process.env.MAIL_FROM) return false;
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV === 'test' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Mail gateway must use HTTPS.');
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MAIL_GATEWAY_TOKEN}` }, body: JSON.stringify({ from: process.env.MAIL_FROM, ...message }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Mail gateway did not accept the message.');
  return true;
}

export function decodeProductPhoto(photo) {
  if (!photo?.confirmed) throw new Error('Confirm the photo represents this product and you have permission to use it.');
  const match = String(photo.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Choose a JPG, PNG or WebP product photo.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('Product photos must be smaller than 4 MB.');
  const type = match[1];
  const valid = type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!valid) throw new Error('The file contents do not match the image type.');
  return { bytes, type, extension: type === 'image/jpeg' ? '.jpg' : type === 'image/png' ? '.png' : '.webp' };
}
