const router = require("express").Router();
const mongoose = require("mongoose");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../middleware/upload");
const notify = require("../config/notify");

router.use(requireAuth);

/* A user claims a found item, giving proof that it is theirs */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { itemId } = req.body;
    const message = (req.body.message || "").trim();
    if (!mongoose.isValidObjectId(itemId) || !message)
      return res.status(400).json({ message: "Please describe the item to prove it is yours." });

    const item = await Item.findById(itemId);
    if (!item || item.type !== "found") return res.status(404).json({ message: "Item not found." });
    if (item.status !== "Pending") return res.status(400).json({ message: "This item is no longer available to claim." });
    if (String(item.owner) === String(req.user._id)) return res.status(400).json({ message: "You can't claim an item you reported." });
    if (await Claim.findOne({ item: item._id, claimant: req.user._id, status: "Pending" }))
      return res.status(409).json({ message: "You already have a pending claim for this item." });

    let imageUrl = "", imagePublicId = "";
    if (req.file) {
      const r = await uploadToCloudinary(req.file.buffer);
      imageUrl = r.secure_url;
      imagePublicId = r.public_id;
    }
    const claim = await Claim.create({ item: item._id, claimant: req.user._id, message, imageUrl, imagePublicId });
    notify.newClaim(item, req.user);
    res.status(201).json(claim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send the claim. Please try again." });
  }
});

/* My claims */
router.get("/mine", async (req, res) => {
  res.json(await Claim.find({ claimant: req.user._id }).populate("item", "name imageUrl location").sort({ createdAt: -1 }));
});

/* Admin: all claims */
router.get("/", requireRole("admin"), async (req, res) => {
  res.json(
    await Claim.find()
      .populate("item", "name imageUrl location status description category")
      .populate("claimant", "name email")
      .sort({ createdAt: -1 })
  );
});

/* Admin: approve or reject */
router.patch("/:id", requireRole("admin"), async (req, res) => {
  const { status } = req.body;
  if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Invalid status." });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Claim not found." });
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "Pending") return res.status(400).json({ message: "This claim was already reviewed." });

  claim.status = status;
  await claim.save();
  if (status === "Approved") {
    await Item.findByIdAndUpdate(claim.item, { status: "Claimed" });
    await Claim.updateMany({ item: claim.item, _id: { $ne: claim._id }, status: "Pending" }, { status: "Rejected" });
  }
  notify.claimReviewed(claim._id, status);
  res.json(claim);
});

/* Claimant: cancel a claim that has not been reviewed yet */
router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Claim not found." });
  const claim = await Claim.findById(req.params.id);
  if (!claim || String(claim.claimant) !== String(req.user._id)) return res.status(404).json({ message: "Claim not found." });
  if (claim.status !== "Pending") return res.status(400).json({ message: "Only pending claims can be cancelled." });
  if (claim.imagePublicId) await require("../config/cloudinary").uploader.destroy(claim.imagePublicId);
  await claim.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
