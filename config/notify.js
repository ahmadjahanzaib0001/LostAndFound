const { transporter, esc } = require("./mailer");
const { collection } = require("./campus");

const siteUrl = () => (process.env.SITE_URL || "http://localhost:" + (process.env.PORT || 5000)).replace(/\/$/, "");

/* Send one email to each address, in the background. A failure only prints a message. */
function send(to, subject, heading, message, page) {
  const list = [].concat(to).filter(Boolean);
  const link = siteUrl() + page;
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e6ebf3;border-radius:12px">' +
    '<h2 style="color:#0f1b33;margin:0 0 10px">' + esc(heading) + '</h2>' +
    '<p style="color:#475569;line-height:1.6">' + esc(message) + '</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open Campus Lost &amp; Found</a></p></div>';
  list.forEach((addr) => {
    transporter
      .sendMail({ from: process.env.MAIL_FROM, to: addr, subject, text: message + " " + link, html })
      .catch((err) => console.error("Email to " + addr + " failed:", err.message));
  });
}

/* A user submitted a claim on a found item */
async function newClaim(item, claimant) {
  try {
    const User = require("../models/User");
    const admins = await User.find({ role: "admin", status: "Active" }).select("email");
    send(admins.map((a) => a.email), "New claim to review", "New claim to review",
      claimant.name + ' has claimed the found item "' + item.name + '". Open the Claims page to read the proof and approve or reject it.',
      "/pages/admin/claims.html");
    const finder = await User.findById(item.owner).select("email");
    if (finder) send(finder.email, "Someone claimed your found item", "Your found item has a claim",
      'A claim was submitted for "' + item.name + '", which you reported as found. An admin will review it.',
      "/pages/user/my-found-items.html");
  } catch (err) { console.error("Notification failed:", err.message); }
}

/* An admin approved or rejected a claim */
async function claimReviewed(claimId, status) {
  try {
    const Claim = require("../models/Claim");
    const User = require("../models/User");
    const c = await Claim.findById(claimId).populate("item", "name owner").populate("claimant", "name email");
    if (!c || !c.item || !c.claimant) return;
    if (status === "Approved") {
      send(c.claimant.email, "Your claim was approved", "Claim approved",
        'Good news! Your claim for "' + c.item.name + '" was approved. Please collect it from ' + collection().point + ' (' + collection().hours + ') and bring your university ID.',
        "/pages/user/claims.html");
      const finder = await User.findById(c.item.owner).select("email");
      if (finder) send(finder.email, "Your found item went back to its owner", "Item returned",
        'Thank you! The item you found, "' + c.item.name + '", was claimed by its owner.',
        "/pages/user/my-found-items.html");
    } else {
      send(c.claimant.email, "Your claim was not approved", "Claim not approved",
        'Your claim for "' + c.item.name + '" was not approved. You can look at the item again and send a new claim with more details.',
        "/pages/user/browse-found.html");
    }
  } catch (err) { console.error("Notification failed:", err.message); }
}

module.exports = { newClaim, claimReviewed };
