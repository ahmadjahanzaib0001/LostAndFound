const crypto = require("crypto");
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/* base32 (the format authenticator apps use for the secret key) */
function b32encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHA[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHA[(value << (5 - bits)) & 31];
  return out;
}
function b32decode(str) {
  let bits = 0, value = 0; const out = [];
  for (const ch of str.replace(/=+$/, "").toUpperCase()) {
    const i = ALPHA.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/* the secret is stored encrypted (AES-256-GCM), never in plain text */
const key = () => crypto.createHash("sha256").update(process.env.JWT_SECRET + ":2fa-key").digest();
function encrypt(text) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("hex")).join(":");
}
function decrypt(payload) {
  const [iv, tag, enc] = payload.split(":").map((h) => Buffer.from(h, "hex"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/* TOTP (RFC 6238): 6 digits, 30-second steps */
function hotp(secretBuf, counter) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", secretBuf).update(b).digest();
  const o = h[19] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, "0");
}
/* returns the matching time step, or 0. A step that was already used is refused (no re-use of a code). */
function verifyTotp(secretB32, code, lastStep, now) {
  const step = Math.floor((now || Date.now()) / 30000), buf = b32decode(secretB32);
  for (let d = -1; d <= 1; d++) {
    const s = step + d;
    if (s <= (lastStep || 0)) continue;
    if (crypto.timingSafeEqual(Buffer.from(hotp(buf, s)), Buffer.from(code))) return s;
  }
  return 0;
}

const newSecret = () => b32encode(crypto.randomBytes(20));
const hashRecovery = (c) => crypto.createHash("sha256").update(c.toLowerCase() + process.env.JWT_SECRET).digest("hex");
function newRecoveryCodes(n) {
  const plain = [], hashes = [];
  for (let i = 0; i < (n || 8); i++) {
    const raw = crypto.randomBytes(5).toString("hex");
    plain.push(raw.slice(0, 5) + "-" + raw.slice(5));
    hashes.push(hashRecovery(raw));
  }
  return { plain, hashes };
}

/* a 6-digit app code OR a one-time recovery code */
async function checkCode(user, input) {
  const code = String(input || "").replace(/[\s-]/g, "");
  if (/^\d{6}$/.test(code)) {
    const step = verifyTotp(decrypt(user.twoFactorSecret), code, user.twoFactorLastStep);
    if (!step) return false;
    user.twoFactorLastStep = step;
    await user.save();
    return true;
  }
  const i = (user.recoveryCodes || []).indexOf(hashRecovery(code));
  if (i === -1) return false;
  user.recoveryCodes = user.recoveryCodes.filter((_, j) => j !== i);
  await user.save();
  return true;
}

module.exports = { newSecret, encrypt, decrypt, hotp, b32decode, verifyTotp, newRecoveryCodes, checkCode };
