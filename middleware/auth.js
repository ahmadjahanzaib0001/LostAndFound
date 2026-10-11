const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select("-password -twoFactorSecret -twoFactorPending -twoFactorLastStep -recoveryCodes");
    if (!user || user.status !== "Active") return res.status(401).json({ message: "Not logged in" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Not allowed" });

module.exports = { requireAuth, requireRole };
