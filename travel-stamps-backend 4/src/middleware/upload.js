const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 5);

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Buffer in memory (not written to disk) so we can validate + resize with
// sharp before ever writing a file — this also means we never trust or
// execute whatever the client claims the file is; sharp only succeeds on
// real, decodable image data.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WEBP images are allowed."));
    }
    cb(null, true);
  },
});

// Resizes to a sensible max dimension and re-encodes as JPEG, discarding
// EXIF metadata (which can otherwise leak the uploader's location/device).
async function processAndSaveImage(buffer, userId) {
  const filename = `${userId}-${crypto.randomBytes(6).toString("hex")}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await sharp(buffer)
    .rotate() // auto-orient based on EXIF, then...
    .resize({ width: 480, height: 480, fit: "cover" })
    .jpeg({ quality: 85 })
    .toFile(filepath); // ...EXIF is dropped by re-encoding
  return `/uploads/${filename}`;
}

module.exports = { upload, processAndSaveImage, UPLOAD_DIR };
