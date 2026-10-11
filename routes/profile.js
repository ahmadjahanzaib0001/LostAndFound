const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");

router.use(requireAuth);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, message: { message: "Too many attempts. Try again later." } });

/* Update name and phone (email and role cannot be changed here) */
router.put("/", async (req, res) => {
  const name = (req.body.name || "").trim();
  const phone = (req.body.phone || "").trim();
  if (!name || name.length > 60) return res.status(400).json({ message: "Please enter your name (max 60 characters)." });
  if (phone.length > 20) return res.status(400).json({ message: "Phone number is too long." });
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true }).select("-password -twoFactorSecret -twoFactorPending -twoFactorLastStep -recoveryCodes");
  res.json(user);
});

/* Change password (needs the current password) */
router.put("/password", limiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters." });
  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(currentPassword || "", user.password)))
    return res.status(400).json({ message: "Current password is incorrect." });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: "Password updated" });
});

/* Profile photo: square 256x256, stored on Cloudinary */
function uploadAvatar(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lost-and-found/avatars",
        transformation: [{ width: 256, height: 256, crop: "fill", gravity: "auto" }, { quality: "auto", fetch_format: "auto" }],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

router.put("/avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please choose an image." });
    const result = await uploadAvatar(req.file.buffer);
    const user = await User.findById(req.user._id);
    if (user.avatarPublicId) await cloudinary.uploader.destroy(user.avatarPublicId);
    user.avatarUrl = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not upload the photo. Please try again." });
  }
});

router.delete("/avatar", async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.avatarPublicId) await cloudinary.uploader.destroy(user.avatarPublicId);
  user.avatarUrl = "";
  user.avatarPublicId = "";
  await user.save();
  res.json({ avatarUrl: "" });
});

module.exports = router;
