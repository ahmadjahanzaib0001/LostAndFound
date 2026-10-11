const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { requireAuth, requireRole } = require("../middleware/auth");
const { isCore } = require("../config/coreAdmin");
const { normalizeEmail, isValidEmail, hasValidPassword } = require("../utils/validation");

router.use(requireAuth, requireRole("admin"));

/* What the logged-in admin is allowed to do to each user (the page only shows allowed buttons,
   but every rule is checked again on the server below). */
function view(viewer, u) {
  const viewerIsCore = isCore(viewer.email);
  const core = isCore(u.email);
  const self = String(u._id) === String(viewer._id);
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    isCore: core,
    isSelf: self,
    canPromote: !core && u.role === "user",
    canDemote: !core && u.role === "admin" && viewerIsCore,
    canDelete: !core && !self && (u.role !== "admin" || viewerIsCore),
    canSuspend: !core && !self && (u.role !== "admin" || viewerIsCore),
  };
}

async function findTarget(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ message: "User not found" }); return null; }
  const target = await User.findById(req.params.id);
  if (!target) { res.status(404).json({ message: "User not found" }); return null; }
  return target;
}

/* List users (core admin first) */
router.get("/", async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  const list = users.map((u) => view(req.user, u));
  list.sort((a, b) => Number(b.isCore) - Number(a.isCore));
  res.json(list);
});

/* Promote a user to admin / remove admin rights */
router.patch("/:id/role", async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (isCore(target.email)) return res.status(403).json({ message: "The core admin cannot be changed." });

  const role = req.body.role;
  if (role === "admin") {
    if (target.role === "admin") return res.status(400).json({ message: "This user is already an admin." });
  } else if (role === "user") {
    if (!isCore(req.user.email)) return res.status(403).json({ message: "Only the core admin can remove admin rights." });
    if (target.role !== "admin") return res.status(400).json({ message: "This user is not an admin." });
  } else {
    return res.status(400).json({ message: "Invalid role." });
  }

  target.role = role;
  await target.save();
  res.json(view(req.user, target));
});

/* Delete a user */
router.delete("/:id", async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (isCore(target.email)) return res.status(403).json({ message: "The core admin cannot be deleted." });
  if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: "You can't delete your own account." });
  if (target.role === "admin" && !isCore(req.user.email))
    return res.status(403).json({ message: "Only the core admin can delete another admin." });

  await target.deleteOne();
  res.json({ ok: true });
});

/* Create a user (the email counts as verified because an admin made the account) */
router.post("/", async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || "";
    const role = req.body.role === "admin" ? "admin" : "user";
    if (!name) return res.status(400).json({ message: "Please enter a name." });
    if (!isValidEmail(email)) return res.status(400).json({ message: "Please enter a valid email." });
    if (!hasValidPassword(password)) return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role });
    res.status(201).json(view(req.user, user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create the user." });
  }
});

/* Suspend (Inactive) or re-activate a user. Same protection rules as delete. */
router.patch("/:id/status", async (req, res) => {
  const target = await findTarget(req, res);
  if (!target) return;
  if (isCore(target.email)) return res.status(403).json({ message: "The core admin cannot be changed." });
  if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: "You can't suspend your own account." });
  if (target.role === "admin" && !isCore(req.user.email)) return res.status(403).json({ message: "Only the core admin can suspend another admin." });
  if (!["Active", "Inactive"].includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
  target.status = req.body.status;
  await target.save();
  res.json(view(req.user, target));
});

module.exports = router;
