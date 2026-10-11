const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const PendingUser = require("../models/PendingUser");
const { sendVerificationCode } = require("../config/mailer");
const { requireAuth } = require("../middleware/auth");
const { isCore } = require("../config/coreAdmin");
const { emailAllowed, domains } = require("../config/campus");
const twofa = require("../config/twofa");
const { normalizeEmail, isValidEmail, hasValidPassword, makeCode, hashCode } = require("../utils/validation");

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: "Too many attempts. Try again later." } });
const home = { user: "user/dashboard.html", admin: "admin/dashboard.html" };

function setToken(res, user, rememberMe = false) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  if (rememberMe) {
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, { ...cookieOptions, maxAge });
    return;
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.cookie("token", token, cookieOptions);
}

/* STEP 1: validate, store pending signup, email the code */
router.post("/register", limiter, async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!name) return res.status(400).json({ message: "Please enter your name." });
    if (!isValidEmail(email)) return res.status(400).json({ message: "Please enter a valid email." });
    if (!isCore(email) && !emailAllowed(email))
      return res.status(400).json({ message: "Please register with your university email (" + domains().map((d) => "@" + d).join(" or ") + ")." });
    if (!hasValidPassword(password)) return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });

    const code = makeCode();
    await PendingUser.findOneAndUpdate(
      { email },
      { name, email, password: await bcrypt.hash(password, 10), codeHash: hashCode(code), attempts: 0, sentAt: new Date(), createdAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );
    await sendVerificationCode(email, name, code);
    res.json({ message: "Verification code sent", email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send the verification email. Please try again." });
  }
});

/* Resend the code (30s cooldown) */
router.post("/resend-code", limiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(404).json({ message: "Registration expired. Please register again." });
    if (Date.now() - pending.sentAt.getTime() < 30000)
      return res.status(429).json({ message: "Please wait a few seconds before requesting another code." });

    const code = makeCode();
    pending.codeHash = hashCode(code);
    pending.attempts = 0;
    pending.sentAt = new Date();
    pending.createdAt = new Date();
    await pending.save();
    await sendVerificationCode(pending.email, pending.name, code);
    res.json({ message: "New code sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send the email. Please try again." });
  }
});

/* STEP 2: check the code, create the real account, log in */
router.post("/verify", limiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();

    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(400).json({ message: "Code expired. Please register again." });

    if (pending.attempts >= 5) {
      await pending.deleteOne();
      return res.status(429).json({ message: "Too many wrong attempts. Please register again." });
    }
    if (pending.codeHash !== hashCode(code)) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }
    if (await User.findOne({ email })) {
      await pending.deleteOne();
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({ name: pending.name, email: pending.email, password: pending.password, role: isCore(pending.email) ? "admin" : "user" });
    await pending.deleteOne();
    setToken(res, user);
    res.status(201).json({ redirect: home[user.role] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/login", limiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || "";
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid email or password." });
    if (user.status !== "Active") return res.status(403).json({ message: "Your account is disabled." });
    if (user.twoFactorEnabled) {
      /* signed with a DIFFERENT key, so it can never be used as a login cookie */
      const pendingToken = jwt.sign({ id: user._id, purpose: "2fa" }, process.env.JWT_SECRET + ":2fa-login", { expiresIn: "5m" });
      return res.json({ twoFactor: true, pendingToken });
    }
    setToken(res, user, req.body.rememberMe === true);
    res.json({ redirect: home[user.role] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

/* Login step 2 (only for accounts with 2FA on). 5 wrong codes lock this account's 2FA step for 15 minutes. */
const twoFaFails = new Map();
router.post("/login/2fa", limiter, async (req, res) => {
  try {
    let payload;
    try { payload = jwt.verify(req.body.pendingToken || "", process.env.JWT_SECRET + ":2fa-login"); }
    catch { return res.status(401).json({ message: "Login expired. Please log in again." }); }
    if (payload.purpose !== "2fa") return res.status(401).json({ message: "Login expired. Please log in again." });

    const rec = twoFaFails.get(String(payload.id)) || { n: 0, until: 0 };
    if (Date.now() < rec.until) return res.status(429).json({ message: "Too many wrong codes. Try again in 15 minutes." });

    const user = await User.findById(payload.id);
    if (!user || user.status !== "Active" || !user.twoFactorEnabled) return res.status(401).json({ message: "Login expired. Please log in again." });

    if (!(await twofa.checkCode(user, req.body.code))) {
      rec.n += 1;
      if (rec.n >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.n = 0; }
      twoFaFails.set(String(payload.id), rec);
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }
    twoFaFails.delete(String(payload.id));
    setToken(res, user, req.body.rememberMe === true);
    res.json({ redirect: home[user.role] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: { ...req.user.toObject(), isCore: isCore(req.user.email) } }));

module.exports = router;
