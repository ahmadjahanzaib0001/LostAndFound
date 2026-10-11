const router = require("express").Router();
const mongoose = require("mongoose");
const Item = require("../models/Item");
const User = require("../models/User");
const Claim = require("../models/Claim");
const cloudinary = require("../config/cloudinary");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../middleware/upload");

router.use(requireAuth, requireRole("admin"));
const STATUSES = ["Pending", "In Review", "Claimed", "Resolved"];

/* Add an item (it is owned by the admin who adds it) */
router.post("/items", upload.single("image"), async (req, res) => {
  try {
    const { type, name, category, location, date, description } = req.body;
    if (!["lost", "found"].includes(type)) return res.status(400).json({ message: "Choose lost or found." });
    if (!name || !category || !location || !date || !description) return res.status(400).json({ message: "Please fill in all required fields." });
    let imageUrl = "", imagePublicId = "";
    if (req.file) { const r = await uploadToCloudinary(req.file.buffer); imageUrl = r.secure_url; imagePublicId = r.public_id; }
    const item = await Item.create({ type, name, category, location, date, description, imageUrl, imagePublicId, owner: req.user._id });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not add the item." });
  }
});

/* Edit any item, including its status and photo */
router.put("/items/:id", upload.single("image"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Item not found" });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const { name, category, location, date, description, status } = req.body;
    if (!name || !category || !location || !date || !description) return res.status(400).json({ message: "Please fill in all required fields." });
    if (status && !STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });
    Object.assign(item, { name, category, location, date, description });
    if (status) item.status = status;
    if (req.file) {
      const r = await uploadToCloudinary(req.file.buffer);
      if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId);
      item.imageUrl = r.secure_url;
      item.imagePublicId = r.public_id;
    }
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save the changes." });
  }
});

/* CSV exports (cells starting with = + - @ are neutralised so spreadsheets do not run them) */
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (s && "=+-@".includes(s[0])) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
const sendCsv = (res, name, header, rows) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="' + name + '"');
  res.send("\uFEFF" + [header].concat(rows).map((r) => r.map(cell).join(",")).join("\r\n"));
};
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

router.get("/export/items.csv", async (req, res) => {
  const items = await Item.find().populate("owner", "name email").sort({ createdAt: -1 });
  sendCsv(res, "items.csv", ["Type", "Name", "Category", "Location", "Date", "Status", "Reported by", "Email", "Created"],
    items.map((i) => [i.type, i.name, i.category, i.location, day(i.date), i.status, i.owner ? i.owner.name : "", i.owner ? i.owner.email : "", day(i.createdAt)]));
});
router.get("/export/users.csv", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  sendCsv(res, "users.csv", ["Name", "Email", "Role", "Status", "Joined"], users.map((u) => [u.name, u.email, u.role, u.status, day(u.createdAt)]));
});
router.get("/export/claims.csv", async (req, res) => {
  const claims = await Claim.find().populate("item", "name").populate("claimant", "name email").sort({ createdAt: -1 });
  sendCsv(res, "claims.csv", ["Item", "Claimant", "Email", "Proof", "Status", "Date"],
    claims.map((c) => [c.item ? c.item.name : "(removed)", c.claimant ? c.claimant.name : "", c.claimant ? c.claimant.email : "", c.message, c.status, day(c.createdAt)]));
});

module.exports = router;
