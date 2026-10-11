const coreEmail = () => (process.env.CORE_ADMIN_EMAIL || "").trim().toLowerCase();

const isCore = (email) => !!coreEmail() && String(email || "").trim().toLowerCase() === coreEmail();

/* Runs at server start: makes sure the core admin account (if registered) is an active admin. */
async function ensureCoreAdmin() {
  const email = coreEmail();
  if (!email) {
    console.warn("WARNING: CORE_ADMIN_EMAIL is not set in .env - there is no protected core admin.");
    return;
  }
  const User = require("../models/User");
  const r = await User.updateOne({ email }, { $set: { role: "admin", status: "Active" } });
  if (r.matchedCount) console.log("Core admin ready: " + email);
  else console.log("Core admin not registered yet. Register " + email + " on the site to claim it.");
}

module.exports = { coreEmail, isCore, ensureCoreAdmin };
