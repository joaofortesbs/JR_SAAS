import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { getMysqlDatabaseUrl } from "./server/_core/databaseConfig";

const connectionString = getMysqlDatabaseUrl();

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
