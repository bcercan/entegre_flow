import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Schema generation/push uses the owner connection.
    url: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
