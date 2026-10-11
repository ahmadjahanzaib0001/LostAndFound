const crypto = require("crypto");

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const hasValidPassword = (password) => typeof password === "string" && password.length >= 6;

const makeCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = (code, secret = process.env.JWT_SECRET) => 
  crypto.createHash("sha256").update(String(code) + String(secret)).digest("hex");

module.exports = { normalizeEmail, isValidEmail, hasValidPassword, makeCode, hashCode };
