require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");

const { attachUser } = require("./middleware/auth");
const { UPLOAD_DIR } = require("./middleware/upload");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profiles");
const spotRoutes = require("./routes/spots");

const app = express();

// Behind a reverse proxy (nginx, Render, Fly, etc.) this is required for
// secure cookies and rate-limit IP detection to work correctly.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN, // exact origin, not "*" — required for credentials
    credentials: true, // allows the httpOnly session cookie to be sent
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser); // best-effort: populates req.userId if a valid session cookie exists

// Serves uploaded profile photos. In production, prefer serving these from
// object storage (S3/R2) + a CDN instead of the app server — see README.
app.use("/uploads", express.static(path.resolve(UPLOAD_DIR)));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/spots", spotRoutes);

// Multer errors (e.g. file too large, wrong type) land here rather than as
// unhandled 500s.
app.use((err, _req, res, _next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Travel Stamps API listening on port ${PORT}`);
});
