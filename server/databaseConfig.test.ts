import { describe, expect, it } from "vitest";
import { getMysqlDatabaseUrl } from "./_core/databaseConfig";

describe("MySQL database configuration", () => {
  it("prefers the dedicated MySQL URL over the managed PostgreSQL URL", () => {
    const mysqlUrl = "mysql://mysql.example.invalid/central_jr";
    expect(
      getMysqlDatabaseUrl({
        MYSQL_DATABASE_URL: mysqlUrl,
        DATABASE_URL: "postgresql://postgres.example.invalid/managed",
      })
    ).toBe(mysqlUrl);
  });

  it("retains compatibility with an existing MySQL DATABASE_URL", () => {
    const mysqlUrl = "mysql://mysql.example.invalid/central_jr";
    expect(getMysqlDatabaseUrl({ DATABASE_URL: mysqlUrl })).toBe(mysqlUrl);
  });

  it("rejects a PostgreSQL URL with an actionable error", () => {
    expect(() =>
      getMysqlDatabaseUrl({
        DATABASE_URL: "postgresql://postgres.example.invalid/managed",
      })
    ).toThrow("Configure MYSQL_DATABASE_URL");
  });

  it("fails explicitly when no database connection is configured", () => {
    expect(() => getMysqlDatabaseUrl({})).toThrow("Configure MYSQL_DATABASE_URL");
  });

  it("does not disclose malformed connection values in errors", () => {
    const invalidValue = "invalid-connection-value";
    let message = "";
    try {
      getMysqlDatabaseUrl({ MYSQL_DATABASE_URL: invalidValue });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("Configure MYSQL_DATABASE_URL");
    expect(message).not.toContain(invalidValue);
  });
});