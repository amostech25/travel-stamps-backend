const { PrismaClient } = require("@prisma/client");

// A single shared instance avoids exhausting DB connections when the module
// is required from multiple route files.
const prisma = new PrismaClient();

module.exports = prisma;
