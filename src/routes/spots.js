const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { writeLimiter, likeLimiter } = require("../middleware/rateLimit");
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
  note: z.string().trim().max(300).optional().default(""),
  mapsUrl: z.string().url().optional().or(z.literal("")).optional(),
});

// Auth required. Always writes under req.userId — there is no way to pass
// "whose map" in the body, so you can only ever add spots to your own map.
router.post("/", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const parsed = spotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { country, city, name, tag, verdict, note, mapsUrl } = parsed.data;

  const countryRow = await prisma.country.upsert({
    where: { userId_name: { userId: req.userId, name: country } },
    update: {},
    create: { userId: req.userId, name: country },
  });
  const cityRow = await prisma.city.upsert({
    where: { countryId_name: { countryId: countryRow.id, name: city } },
    update: {},
    create: { countryId: countryRow.id, name: city },
  });
  const spot = await prisma.spot.create({
    data: {
      cityId: cityRow.id,
      name,
      tag,
      verdict,
      note,
      mapsUrl: mapsUrl || null,
    },
  });

  res.status(201).json({ id: spot.id, country, city });
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

// Ownership check matters here: without it, any signed-in user could POST to
// someone else's spot ID and vandalize their page. We verify the spot's
// city -> country -> user chain resolves to the requester before writing.
async function assertOwnsSpot(spotId, userId) {
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    include: { city: { include: { country: true } } },
  });
  if (!spot) return { ok: false, code: 404, message: "Spot not found." };
  if (spot.city.country.userId !== userId) {
    return { ok: false, code: 403, message: "You can only edit your own spots." };
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

// Toggle like — the (spotId, userId) unique constraint on Like means this is
// safe even under rapid double-clicks or concurrent requests: the second
// attempt to create will fail on the constraint rather than double-counting.
router.post("/:id/like", requireAuth, likeLimiter, asyncHandler(async (req, res) => {
  const spot = await prisma.spot.findUnique({ where: { id: req.params.id } });
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const existing = await prisma.like.findUnique({
    where: { spotId_userId: { spotId: req.params.id, userId: req.userId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { spotId: req.params.id, userId: req.userId } });
  }

  const count = await prisma.like.count({ where: { spotId: req.params.id } });
  res.json({ liked: !existing, likeCount: count });
}));

module.exports = router;
