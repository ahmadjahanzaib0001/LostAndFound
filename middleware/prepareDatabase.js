const connectDB = require("../config/db");
const { ensureCoreAdmin } = require("../config/coreAdmin");

let adminSetupPromise;

async function prepareDatabase() {
  await connectDB();
  if (!adminSetupPromise) {
    adminSetupPromise = ensureCoreAdmin().catch((err) => {
      adminSetupPromise = null;
      throw err;
    });
  }
  await adminSetupPromise;
}

async function databaseReady(req, res, next) {
  if (req.path === "/auth/logout") return next();
  try {
    await prepareDatabase();
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { prepareDatabase, databaseReady };
