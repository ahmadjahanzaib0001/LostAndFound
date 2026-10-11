const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { transporter, esc } = require("../config/mailer");
const { normalizeEmail, hasValidPassword, makeCode, hashCode } = require("../utils/validation");

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: "Too many attempts. Try again later." } });
const GENERIC = { message: "If that email has an account, a reset code has been sent." };

/* Step 1: email a code (same answer whether or not the account exists) */
router.post("/forgot", limiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = email ? await User.findOne({ email }) : null;
    if (user && user.status === "Active") {
      const old = await PasswordReset.findOne({ email });
      if (!old || Date.now() - old.sentAt.getTime() >= 30000) {
        const code = makeCode();
        await PasswordReset.findOneAndUpdate(
          { email },
          { email, codeHash: hashCode(code), attempts: 0, sentAt: new Date(), createdAt: new Date() },
          { upsert: true, setDefaultsOnInsert: true }
        );
        await transporter.sendMail({
          from: process.env.MAIL_FROM,
          to: email,
          subject: "Reset your Campus Lost & Found password",
          text: "Hi " + user.name + ", your password reset code is " + code + ". It expires in 10 minutes.",
          html: '<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e6ebf3;border-radius:12px"><h2 style="color:#0f1b33;margin:0 0 8px">Reset your password</h2><p style="color:#475569">Hi ' + esc(user.name) + ', use this code to set a new password:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;margin:16px 0">' + code + '</p><p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you did not ask for it, ignore this email.</p></div>',
        });
      }
    }
    res.json(GENERIC);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send the email. Please try again." });
  }
});

/* Step 2: check the code and set the new password */
router.post("/reset", limiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    const password = req.body.password || "";
    if (!hasValidPassword(password)) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const r = await PasswordReset.findOne({ email });
    if (!r) return res.status(400).json({ message: "Code expired. Please request a new one." });
    if (r.attempts >= 5) { await r.deleteOne(); return res.status(429).json({ message: "Too many wrong attempts. Please request a new code." }); }
    if (r.codeHash !== hashCode(code)) {
      r.attempts += 1;
      await r.save();
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }
    const user = await User.findOne({ email });
    if (!user) { await r.deleteOne(); return res.status(400).json({ message: "Code expired. Please request a new one." }); }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await r.deleteOne();
    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
