const router = require("express").Router();
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

/* Numbers for the logged-in user's dashboard */
router.get("/user", async (req, res) => {
  const me = req.user._id;
  const [lost, found, claimed, recent] = await Promise.all([
    Item.countDocuments({ owner: me, type: "lost" }),
    Item.countDocuments({ owner: me, type: "found" }),
    Claim.countDocuments({ claimant: me, status: "Approved" }),
    Item.find({ owner: me }).sort({ createdAt: -1 }).limit(3).select("name type location date imageUrl status"),
  ]);
  res.json({ lost, found, claimed, recent });
});

/* Numbers for the admin dashboard and reports (last 5 weeks in the chart) */
router.get("/admin", requireRole("admin"), async (req, res) => {
  const WEEKS = 5, DAY = 86400000;
  const start = new Date(Date.now() - WEEKS * 7 * DAY);
  const [lost, found, claimed, users, pendingClaims, recentItems, cats] = await Promise.all([
    Item.countDocuments({ type: "lost" }),
    Item.countDocuments({ type: "found" }),
    Item.countDocuments({ status: "Claimed" }),
    User.countDocuments(),
    Claim.countDocuments({ status: "Pending" }),
    Item.find({ createdAt: { $gte: start } }).select("type createdAt"),
    Item.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
  ]);

  const labels = [], lostArr = Array(WEEKS).fill(0), foundArr = Array(WEEKS).fill(0);
  for (let i = 0; i < WEEKS; i++)
    labels.push(new Date(start.getTime() + i * 7 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  recentItems.forEach((it) => {
    const i = Math.min(WEEKS - 1, Math.floor((it.createdAt - start) / (7 * DAY)));
    (it.type === "lost" ? lostArr : foundArr)[i]++;
  });

  res.json({
    lost, found, claimed, users, pendingClaims,
    chart: { labels, lost: lostArr, found: foundArr },
    categories: cats.map((c) => ({ name: c._id, count: c.count })),
  });
});

module.exports = router;
