require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { prepareDatabase, databaseReady } = require("./middleware/prepareDatabase");

const app = express();
if (process.env.VERCEL) app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use("/api/config", require("./routes/config"));
app.use("/api", databaseReady);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/items", require("./routes/items"));
app.use("/api/users", require("./routes/users"));
app.use("/api/claims", require("./routes/claims"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/2fa", require("./routes/twofa"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/auth", require("./routes/reset"));
app.use("/api", (req, res) => res.status(404).json({ message: "Not found" }));

app.use(express.static(path.join(__dirname, "public")));

// Error handler (upload errors, etc.)
app.use((err, req, res, next) => {
  console.error(err);
  const bad = err.name === "MulterError" || err.message === "Only image files are allowed";
  const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 5 MB." : err.message || "Server error";
  res.status(bad ? 400 : 500).json({ message });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  prepareDatabase()
    .then(() => app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`)))
    .catch((err) => { console.error("DB connection failed:", err.message); process.exit(1); });
}

module.exports = app;
