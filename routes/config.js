const router = require("express").Router();
const { domains, collection } = require("../config/campus");

/* Public, non-secret settings the pages need (register hint, where to collect items) */
router.get("/", (req, res) => {
  const c = collection();
  res.json({ emailDomains: domains(), collectionPoint: c.point, collectionHours: c.hours });
});

module.exports = router;
