/* Emergency: turn 2FA off for an account (lost phone AND lost recovery codes).
   Usage:  node scripts/disable-2fa.js user@email.com */
require("dotenv").config();
const mongoose = require("mongoose");
(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) { console.log("Usage: node scripts/disable-2fa.js user@email.com"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const r = await mongoose.connection.collection("users").updateOne(
    { email }, { $set: { twoFactorEnabled: false, twoFactorSecret: "", twoFactorPending: "", twoFactorLastStep: 0, recoveryCodes: [] } });
  console.log(r.matchedCount ? "2FA turned off for " + email : "No user with that email.");
  await mongoose.disconnect();
})();
