const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

function tierFor(count) {
  if (count >= 10) return "Legend";
  if (count >= 5) return "Globetrotter";
  if (count >= 2) return "Wanderer";
  return "Explorer";
}

function shapeResult(user) {
  return {
    handle: user.handle,
    displayName: user.displayName,
    tier: tierFor(user._count.countries),
    countryCount: user._count.countries,
    types: user.bio ? user.bio.types.map((t) => t.label) : [],
    photoUrl: user.bio ? user.bio.photoUrl : null,
  };
}

// GET /api/search?q=...   (empty q = directory listing, most recent first)
router.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();
  const excludeHandle = req.userHandle;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        excludeHandle ? { handle: { not: excludeHandle } } : {},
        q
          ? { OR: [{ handle: { contains: q.toLowerCase() } }, { displayName: { contains: q } }] }
          : {},
      ],
    },
    include: { bio: { include: { types: true } }, _count: { select: { countries: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  res.json(users.map(shapeResult));
});

// GET /api/search/tags/:tag
router.get("/tags/:tag", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { bio: { types: { some: { label: req.params.tag } } } },
    include: { bio: { include: { types: true } }, _count: { select: { countries: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  res.json(users.map(shapeResult));
});

module.exports = router;
