/* Campus settings read from .env - edit them there, not here. */

/* ALLOWED_EMAIL_DOMAINS=uet.edu.pk,students.uet.edu.pk  (empty = anyone can register) */
const domains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

/* true if the email belongs to an allowed university domain (subdomains such as cs.uet.edu.pk count too) */
function emailAllowed(email) {
  const list = domains();
  if (!list.length) return true;
  const host = String(email || "").trim().toLowerCase().split("@")[1] || "";
  return list.some((d) => host === d || host.endsWith("." + d));
}

const collection = () => ({
  point: (process.env.COLLECTION_POINT || "Campus Security Office").trim(),
  hours: (process.env.COLLECTION_HOURS || "Mon-Fri, 9:00 AM - 4:00 PM").trim(),
});

module.exports = { domains, emailAllowed, collection };
