// import { definePrismaConfig } from "prisma/config";

// export default definePrismaConfig({
//   skills: {
//     agents: ["claude", "cursor", "agents", "devin"],
//   },
// });


import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env["DATABASE_URL"],
  },
});