const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertSample({ handle, displayName, password, bio, countries }) {
  const existing = await prisma.user.findUnique({ where: { handle } });
  if (existing) {
    console.log(`Skipping ${handle} — already exists.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      handle,
      displayName,
      passwordHash,
      bio: {
        create: {
          summary: bio.summary,
          insight: bio.insight,
          types: { create: bio.types.map((label) => ({ label })) },
          links: { create: bio.links },
        },
      },
      countries: {
        create: countries.map((c) => ({
          name: c.name,
          cities: {
            create: c.cities.map((city) => ({
              name: city.name,
              spots: {
                create: city.spots.map((s) => ({
                  name: s.name,
                  tag: s.tag,
                  verdict: s.verdict,
                  note: s.note,
                  mapsUrl: s.mapsUrl,
                })),
              },
            })),
          },
        })),
      },
    },
  });
  console.log(`Seeded ${handle}.`);
}

async function main() {
  await upsertSample({
    handle: "mara-travels",
    displayName: "Mara",
    password: "demo-password-change-me",
    bio: {
      summary: "Museum-hopping foodie who plans trips around ramen shops and quiet shrines.",
      insight: "Always books the first activity of the day early morning to beat the crowds.",
      types: ["Foodie", "Culture buff", "Solo traveller"],
      links: [
        { type: "instagram", url: "https://instagram.com/mara.travels" },
        { type: "youtube", url: "https://youtube.com/@maratravels" },
      ],
    },
    countries: [
      {
        name: "Japan",
        cities: [
          {
            name: "Tokyo",
            spots: [
              { name: "Nezu Shrine", tag: "sight", verdict: "must-see", note: "Torii gate tunnel, quiet even on weekends", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Nezu+Shrine+Tokyo" },
              { name: "Afuri Ramen", tag: "food", verdict: "good", note: "Yuzu shio ramen, go before 12pm", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Afuri+Ramen+Tokyo" },
            ],
          },
          {
            name: "Kyoto",
            spots: [
              { name: "Fushimi Inari", tag: "sight", verdict: "must-see", note: "Hike past the third rest stop, crowds thin out", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Fushimi+Inari+Kyoto" },
            ],
          },
        ],
      },
    ],
  });

  await upsertSample({
    handle: "theo-goes",
    displayName: "Theo",
    password: "demo-password-change-me",
    bio: {
      summary: "Slow traveller who picks one neighborhood a day and just wanders.",
      insight: "Prefers overnight trains over flights whenever the route allows it.",
      types: ["Slow traveller", "Adventurer"],
      links: [{ type: "tiktok", url: "https://tiktok.com/@theogoes" }],
    },
    countries: [
      {
        name: "Portugal",
        cities: [
          {
            name: "Lisbon",
            spots: [
              { name: "Pasteis de Belem", tag: "food", verdict: "must-see", note: "Original custard tart shop, go early", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pasteis+de+Belem+Lisbon" },
              { name: "Miradouro da Graca", tag: "sight", verdict: "good", note: "Best sunset view, bring a drink", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miradouro+da+Graca+Lisbon" },
            ],
          },
        ],
      },
    ],
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
