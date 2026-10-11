const router = require("express").Router();
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const t = require("../config/twofa");

router.use(requireAuth, requireRole("admin"));
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: "Too many attempts. Try again later." } });
const me = (req) => User.findById(req.user._id);   /* the full record, including the 2FA fields */

router.get("/status", async (req, res) => {
  const u = await me(req);
  res.json({ enabled: !!u.twoFactorEnabled, recoveryLeft: (u.recoveryCodes || []).length });
});

/* Step 1: make a secret and a QR code (not active until the first code is confirmed) */
router.post("/setup", limiter, async (req, res) => {
  const u = await me(req);
  if (u.twoFactorEnabled) return res.status(400).json({ message: "Two-factor authentication is already on." });
  const secret = t.newSecret();
  u.twoFactorPending = t.encrypt(secret);
  await u.save();
  const issuer = encodeURIComponent("Campus Lost & Found");
  const uri = "otpauth://totp/" + issuer + ":" + encodeURIComponent(u.email) + "?secret=" + secret + "&issuer=" + issuer + "&digits=6&period=30";
  res.json({ secret: secret.match(/.{1,4}/g).join(" "), qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) });
});

/* Step 2: the admin types the first code from the app -> 2FA is on, recovery codes are shown once */
router.post("/enable", limiter, async (req, res) => {
  const u = await me(req);
  if (u.twoFactorEnabled) return res.status(400).json({ message: "Two-factor authentication is already on." });
  if (!u.twoFactorPending) return res.status(400).json({ message: "Start the setup first." });
  const code = String(req.body.code || "").replace(/\s/g, "");
  const step = /^\d{6}$/.test(code) ? t.verifyTotp(t.decrypt(u.twoFactorPending), code, 0) : 0;
  if (!step) return res.status(400).json({ message: "That code is not correct. Check the clock on your phone and try again." });
  const rc = t.newRecoveryCodes(8);
  u.twoFactorEnabled = true;
  u.twoFactorSecret = u.twoFactorPending;
  u.twoFactorPending = "";
  u.twoFactorLastStep = step;
  u.recoveryCodes = rc.hashes;
  await u.save();
  res.json({ recoveryCodes: rc.plain });
});

/* Turn it off: needs the password AND a current code (or a recovery code) */
router.post("/disable", limiter, async (req, res) => {
  const u = await me(req);
  if (!u.twoFactorEnabled) return res.status(400).json({ message: "Two-factor authentication is not on." });
  if (!(await bcrypt.compare(req.body.password || "", u.password))) return res.status(400).json({ message: "Password is incorrect." });
  if (!(await t.checkCode(u, req.body.code))) return res.status(400).json({ message: "That code is not correct." });
  u.twoFactorEnabled = false; u.twoFactorSecret = ""; u.twoFactorPending = ""; u.twoFactorLastStep = 0; u.recoveryCodes = [];
  await u.save();
  res.json({ ok: true });
});

module.exports = router;
