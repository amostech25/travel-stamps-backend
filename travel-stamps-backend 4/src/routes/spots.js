const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimit");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

const TAGS = ["food", "sight", "hike", "other"];
const VERDICTS = ["must-see", "good", "skip"];

const spotSchema = z.object({
  country: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  tag: z.enum(TAGS).optional().default("other"),
  verdict: z.enum(VERDICTS).optional().default("good"),
  note: z.string().trim().max(1000).optional().default(""),
  mapsUrl: z.string().url().optional().or(z.literal("")).optional(),
  blackOwned: z.boolean().optional().default(false),
});

// Looks up (or creates) the single owner's country/city rows, since every
// spot — admin-added or a public submission — still lives under the one
// owner's map. Public submitters never provide or need a userId.
async function findOwnerId() {
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!owner) return null;
  return owner.id;
}
async function upsertCountryCity(ownerId, country, city) {
  const countryRow = await prisma.country.upsert({
    where: { userId_name: { userId: ownerId, name: country } },
    update: {},
    create: { userId: ownerId, name: country },
  });
  const cityRow = await prisma.city.upsert({
    where: { countryId_name: { countryId: countryRow.id, name: city } },
    update: {},
    create: { countryId: countryRow.id, name: city },
  });
  return cityRow;
}

// Admin-only: add a spot directly to the live map, auto-approved. This is
// what the "+" button does when you're signed in.
router.post("/", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const parsed = spotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { country, city, name, tag, verdict, note, mapsUrl, blackOwned } = parsed.data;
  const cityRow = await upsertCountryCity(req.userId, country, city);
  const spot = await prisma.spot.create({
    data: { cityId: cityRow.id, name, tag, verdict, note, mapsUrl: mapsUrl || null, blackOwned, status: "approved" },
  });
  res.status(201).json({ id: spot.id, country, city });
}));

// Public: anyone can suggest a spot, no account needed. It's created as
// "pending" and only appears once the admin approves it — this route
// deliberately has no requireAuth.
router.post("/submit", writeLimiter, asyncHandler(async (req, res) => {
  const parsed = spotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const ownerId = await findOwnerId();
  if (!ownerId) return res.status(404).json({ error: "This guide hasn't been set up yet." });

  const { country, city, name, tag, verdict, note, mapsUrl, blackOwned } = parsed.data;
  const cityRow = await upsertCountryCity(ownerId, country, city);
  const spot = await prisma.spot.create({
    data: { cityId: cityRow.id, name, tag, verdict, note, mapsUrl: mapsUrl || null, blackOwned, status: "pending" },
  });
  res.status(201).json({ id: spot.id });
}));

// Admin-only: the review queue. Includes each spot's country/city, since
// pending spots aren't shown nested in the normal map browsing views.
router.get("/pending", requireAuth, asyncHandler(async (req, res) => {
  const spots = await prisma.spot.findMany({
    where: { status: "pending", city: { country: { userId: req.userId } } },
    include: { city: { include: { country: true } }, references: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(spots.map((s) => ({
    id: s.id, name: s.name, tag: s.tag, verdict: s.verdict, note: s.note,
    mapsUrl: s.mapsUrl, blackOwned: s.blackOwned, createdAt: s.createdAt,
    country: s.city.country.name, city: s.city.name,
  })));
}));

const refSchema = z.object({
  url: z.string().url(),
  label: z.string().trim().max(80).optional().default("Reference"),
  type: z.enum(["youtube", "tiktok", "instagram", "image"]).optional(),
});

function detectType(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/instagram\.com/.test(url)) return "instagram";
  return "image";
}

// Ownership check: verifies the spot's city -> country -> user chain
// resolves to the requester before any write (approve, reject/delete, or
// adding a reference) — so only the actual admin can act on it.
async function assertOwnsSpot(spotId, userId) {
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    include: { city: { include: { country: true } } },
  });
  if (!spot) return { ok: false, code: 404, message: "Spot not found." };
  if (spot.city.country.userId !== userId) {
    return { ok: false, code: 403, message: "You can only manage your own map." };
  }
  return { ok: true, spot };
}

router.post("/:id/references", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const parsed = refSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Paste a valid link." });

  const check = await assertOwnsSpot(req.params.id, req.userId);
  if (!check.ok) return res.status(check.code).json({ error: check.message });

  const { url, label } = parsed.data;
  const type = parsed.data.type || detectType(url);

  const ref = await prisma.spotReference.create({
    data: { spotId: req.params.id, type, url, label },
  });
  res.status(201).json(ref);
}));

// Admin-only: publish a pending submission to the live map.
router.patch("/:id/approve", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const check = await assertOwnsSpot(req.params.id, req.userId);
  if (!check.ok) return res.status(check.code).json({ error: check.message });
  await prisma.spot.update({ where: { id: req.params.id }, data: { status: "approved" } });
  res.status(204).end();
}));

// Admin-only: reject a pending submission, or remove a spot already on the
// live map — both are just "this spot goes away," so one route covers it.
router.delete("/:id", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const check = await assertOwnsSpot(req.params.id, req.userId);
  if (!check.ok) return res.status(check.code).json({ error: check.message });
  await prisma.spot.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
