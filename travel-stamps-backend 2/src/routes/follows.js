const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { likeLimiter } = require("../middleware/rateLimit");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

function tierFor(count) {
  if (count >= 10) return "Legend"; if (count >= 5) return "Globetrotter"; if (count >= 2) return "Wanderer"; return "Explorer";
}

// Toggle follow/unfollow — same shape as the like toggle: the (followerId,
// followingId) unique constraint on Follow makes this safe under rapid
// double-clicks, and there's no separate "unfollow" endpoint to keep in sync.
router.post("/:handle", requireAuth, likeLimiter, asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { handle: req.params.handle.toLowerCase() } });
  if (!target) return res.status(404).json({ error: "No traveller with that handle." });
  if (target.id === req.userId) return res.status(400).json({ error: "You can't follow yourself." });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.userId, followingId: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId: req.userId, followingId: target.id } });
  }

  const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
  res.json({ following: !existing, followerCount });
}));

// The people the signed-in user follows, each with their most recent
// addition — this is the whole "keep track of their locations" feature: no
// activity feed or notifications table, just "what's the latest spot they
// logged, and where."
router.get("/following", requireAuth, asyncHandler(async (req, res) => {
  const follows = await prisma.follow.findMany({
    where: { followerId: req.userId },
    include: {
      following: {
        include: { bio: { include: { types: true } }, _count: { select: { countries: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = await Promise.all(
    follows.map(async (f) => {
      const user = f.following;
      const latestSpot = await prisma.spot.findFirst({
        where: { city: { country: { userId: user.id } } },
        orderBy: { createdAt: "desc" },
        include: { city: { include: { country: true } } },
      });
      return {
        handle: user.handle,
        displayName: user.displayName,
        tier: tierFor(user._count.countries),
        countryCount: user._count.countries,
        types: user.bio ? user.bio.types.map((t) => t.label) : [],
        latest: latestSpot
          ? { spotName: latestSpot.name, city: latestSpot.city.name, country: latestSpot.city.country.name, at: latestSpot.createdAt }
          : null,
      };
    })
  );

  res.json(results);
}));

module.exports = router;
