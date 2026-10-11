const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const cloudinary = require("../config/cloudinary");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../middleware/upload");

/* PUBLIC: found items waiting for their owner. No login needed; description and finder stay hidden. */
const publicLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, message: { message: "Too many requests. Try again in a minute." } });
router.get("/public", publicLimiter, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 60, 100);
  res.json(
    await Item.find({ type: "found", status: "Pending" })
      .select("name category location date imageUrl")
      .sort({ createdAt: -1 })
      .limit(limit)
  );
});

router.use(requireAuth);

/* Create: claimants create "lost" items, finders create "found" items */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { type, name, category, location, date, description } = req.body;
    if (!["lost", "found"].includes(type)) return res.status(400).json({ message: "Invalid item type." });
    if (!name || !category || !location || !date || !description)
      return res.status(400).json({ message: "Please fill in all required fields." });

    let imageUrl = "", imagePublicId = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }
    const item = await Item.create({
      type,
      name, category, location, date, description, imageUrl, imagePublicId,
      owner: req.user._id,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save the item. Please try again." });
  }
});

/* My items */
router.get("/mine", async (req, res) => {
  res.json(await Item.find({ owner: req.user._id }).sort({ createdAt: -1 }));
});

/* Admin: all items (optional ?type=lost|found) */
router.get("/", requireRole("admin"), async (req, res) => {
  const filter = ["lost", "found"].includes(req.query.type) ? { type: req.query.type } : {};
  res.json(await Item.find(filter).populate("owner", "name email").sort({ createdAt: -1 }));
});

/* Found items anyone can claim (description hidden on purpose) */
router.get("/browse", async (req, res) => {
  res.json(
    await Item.find({ type: "found", status: "Pending", owner: { $ne: req.user._id } })
      .select("name category location date imageUrl")
      .sort({ createdAt: -1 })
  );
});

/* One item (owner or admin) */
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Item not found" });
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  if (req.user.role !== "admin" && String(item.owner) !== String(req.user._id))
    return res.status(403).json({ message: "Not allowed" });
  res.json(item);
});

/* Admin: change status */
router.patch("/:id/status", requireRole("admin"), async (req, res) => {
  const { status } = req.body;
  if (!["Pending", "In Review", "Claimed", "Resolved"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  const item = await Item.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!item) return res.status(404).json({ message: "Item not found" });
  res.json(item);
});

const validId = (id) => mongoose.isValidObjectId(id);
const closed = (s) => s === "Claimed" || s === "Resolved";

/* Owner: edit an item that is still open (new photo optional) */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ message: "Item not found" });
    const item = await Item.findById(req.params.id);
    if (!item || String(item.owner) !== String(req.user._id)) return res.status(404).json({ message: "Item not found" });
    if (closed(item.status)) return res.status(400).json({ message: "This item can no longer be edited." });
    const { name, category, location, date, description } = req.body;
    if (!name || !category || !location || !date || !description)
      return res.status(400).json({ message: "Please fill in all required fields." });
    Object.assign(item, { name, category, location, date, description });
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
    res.status(500).json({ message: "Could not save the changes. Please try again." });
  }
});

/* Owner: "I found it myself" (lost items only) */
router.patch("/:id/resolve", async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Item not found" });
  const item = await Item.findById(req.params.id);
  if (!item || String(item.owner) !== String(req.user._id)) return res.status(404).json({ message: "Item not found" });
  if (item.type !== "lost") return res.status(400).json({ message: "Only lost items can be marked as found." });
  if (closed(item.status)) return res.status(400).json({ message: "This item is already closed." });
  item.status = "Resolved";
  await item.save();
  res.json(item);
});

/* Owner: found items that may be the lost item (same category, similar name first) */
router.get("/:id/matches", async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Item not found" });
  const item = await Item.findById(req.params.id);
  if (!item || String(item.owner) !== String(req.user._id)) return res.status(404).json({ message: "Item not found" });
  if (item.type !== "lost") return res.json([]);
  const words = item.name.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const found = await Item.find({ type: "found", status: "Pending", owner: { $ne: req.user._id }, category: item.category })
    .select("name category location date imageUrl").sort({ createdAt: -1 }).limit(30);
  const score = (f) => words.filter((w) => f.name.toLowerCase().includes(w)).length;
  res.json(found.sort((a, b) => score(b) - score(a)).slice(0, 6));
});

/* Delete: the owner (unless already claimed) or an admin. Also removes photos and claims. */
router.delete("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Item not found" });
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  const admin = req.user.role === "admin";
  if (!admin && String(item.owner) !== String(req.user._id)) return res.status(403).json({ message: "Not allowed" });
  if (!admin && item.status === "Claimed") return res.status(400).json({ message: "A claimed item cannot be deleted." });

  const claims = await Claim.find({ item: item._id });
  for (const c of claims) if (c.imagePublicId) await cloudinary.uploader.destroy(c.imagePublicId);
  await Claim.deleteMany({ item: item._id });
  if (item.imagePublicId) await cloudinary.uploader.destroy(item.imagePublicId);
  await item.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
