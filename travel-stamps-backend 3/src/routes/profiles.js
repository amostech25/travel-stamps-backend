const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimit");
const { upload, processAndSaveImage } = require("../middleware/upload");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

const TRAVELER_TYPES = [
  "Backpacker", "Luxury seeker", "Foodie", "Adventurer", "Culture buff",
  "Slow traveller", "Digital nomad", "Family traveller", "Solo traveller",
];

function tierFor(count) {
  if (count >= 10) return "Legend";
  if (count >= 5) return "Globetrotter";
  if (count >= 2) return "Wanderer";
  return "Explorer";
}

// Shapes the owner's record (with nested relations) into the JSON contract
// the frontend expects. No viewer-specific fields anymore — there's only
// one profile, and it's the same for everyone who loads it.
function shapeProfile(user) {
  const countryCount = user.countries.length;
  return {
    handle: user.handle,
    displayName: user.displayName,
    createdAt: user.createdAt,
    tier: tierFor(countryCount),
    countryCount,
    bio: user.bio
      ? {
          summary: user.bio.summary,
          insight: user.bio.insight,
          photoUrl: user.bio.photoUrl,
          types: user.bio.types.map((t) => t.label),
          links: user.bio.links.map((l) => ({ type: l.type, url: l.url })),
        }
      : { summary: "", insight: "", photoUrl: null, types: [], links: [] },
    countries: user.countries.map((c) => ({
      name: c.name,
      cities: c.cities.map((city) => ({
        name: city.name,
        spots: city.spots.map((s) => ({
          id: s.id,
          name: s.name,
          tag: s.tag,
          verdict: s.verdict,
          note: s.note,
          mapsUrl: s.mapsUrl,
          blackOwned: s.blackOwned,
          references: s.references.map((r) => ({ type: r.type, url: r.url, label: r.label })),
        })),
      })),
    })),
  };
}

const fullInclude = {
  bio: { include: { types: true, links: true } },
  countries: {
    include: {
      cities: {
        include: {
          spots: { include: { references: true } },
        },
      },
    },
  },
};

// The main entry point now: there's only one profile, so the frontend
// doesn't need to know a handle up front to load it. Returns 404 only in
// the (expected, one-time) case where the owner account hasn't been
// created yet — the frontend uses that to show the setup screen.
router.get("/", asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({ include: fullInclude, orderBy: { createdAt: "asc" } });
  if (!user) return res.status(404).json({ error: "This guide hasn't been set up yet." });
  res.json(shapeProfile(user));
}));

// Kept for convenience/back-compat — same data, reached by handle.
router.get("/:handle", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { handle: req.params.handle.toLowerCase() },
    include: fullInclude,
  });
  if (!user) return res.status(404).json({ error: "No traveller with that handle." });
  res.json(shapeProfile(user));
}));

const bioSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  types: z.array(z.enum(TRAVELER_TYPES)).min(1).max(9),
  insight: z.string().trim().max(300).optional().default(""),
  links: z
    .array(z.object({ type: z.string(), url: z.string().url() }))
    .max(10)
    .optional()
    .default([]),
});

// Auth required — and note there's no ":handle" param here at all. You can
// only ever edit YOUR OWN bio (req.userId from the verified session).
router.patch("/me/bio", requireAuth, writeLimiter, asyncHandler(async (req, res) => {
  const parsed = bioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { summary, types, insight, links } = parsed.data;

  await prisma.$transaction([
    prisma.bioType.deleteMany({ where: { bio: { userId: req.userId } } }),
    prisma.socialLink.deleteMany({ where: { bio: { userId: req.userId } } }),
    prisma.bio.update({
      where: { userId: req.userId },
      data: {
        summary,
        insight,
        types: { create: types.map((label) => ({ label })) },
        links: { create: links.map((l) => ({ type: l.type, url: l.url })) },
      },
    }),
  ]);

  res.status(204).end();
}));

router.post("/me/photo", requireAuth, writeLimiter, upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded." });
  try {
    const photoUrl = await processAndSaveImage(req.file.buffer, req.userId);
    await prisma.bio.update({ where: { userId: req.userId }, data: { photoUrl } });
    res.json({ photoUrl });
  } catch (e) {
    res.status(400).json({ error: e.message || "Could not process that image." });
  }
});

module.exports = router;
