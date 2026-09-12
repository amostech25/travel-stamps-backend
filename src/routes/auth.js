const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { setSessionCookie, clearSessionCookie, requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const asyncHandler = require("../lib/asyncHandler");

const router = express.Router();

const TRAVELER_TYPES = [
  "Backpacker", "Luxury seeker", "Foodie", "Adventurer", "Culture buff",
  "Slow traveller", "Digital nomad", "Family traveller", "Solo traveller",
];

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const signupSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  handle: z.string().trim().min(2).max(40),
  password: z.string().min(4).max(200),
  bio: z.object({
    summary: z.string().trim().min(1).max(500),
    types: z.array(z.enum(TRAVELER_TYPES)).min(1).max(9),
    insight: z.string().trim().max(300).optional().default(""),
    links: z
      .array(z.object({ type: z.string(), url: z.string().url() }))
      .max(10)
      .optional()
      .default([]),
  }),
});

router.post("/signup", authLimiter, asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { displayName, password, bio } = parsed.data;
  const handle = slug(parsed.data.handle);
  if (!handle) return res.status(400).json({ error: "Invalid handle." });

  const existing = await prisma.user.findUnique({ where: { handle } });
  if (existing) return res.status(409).json({ error: "That handle's taken, try another." });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      handle,
      displayName,
      passwordHash,
      bio: {
        create: {
          summary: bio.summary,
          insight: bio.insight || "",
          types: { create: bio.types.map((label) => ({ label })) },
          links: { create: bio.links.map((l) => ({ type: l.type, url: l.url })) },
        },
      },
    },
  });

  setSessionCookie(res, user);
  res.status(201).json({ id: user.id, handle: user.handle, displayName: user.displayName });
}));

const loginSchema = z.object({
  handle: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post("/login", authLimiter, asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter your handle and password." });

  const handle = slug(parsed.data.handle);
  const user = await prisma.user.findUnique({ where: { handle } });

  // Same error for "no such user" and "wrong password" — don't leak which
  // handles exist via response differences.
  const invalid = () => res.status(401).json({ error: "Handle or password didn't match." });

  if (!user) return invalid();
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return invalid();

  setSessionCookie(res, user);
  res.json({ id: user.id, handle: user.handle, displayName: user.displayName });
}));

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, handle: true, displayName: true },
  });
  if (!user) return res.status(404).json({ error: "Not found." });
  res.json(user);
}));

module.exports = router;
