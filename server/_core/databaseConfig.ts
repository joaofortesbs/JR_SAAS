type DatabaseEnvironment = {
  MYSQL_DATABASE_URL?: string;
  DATABASE_URL?: string;
};

export function getMysqlDatabaseUrl(
  environment: DatabaseEnvironment = {
    MYSQL_DATABASE_URL: process.env.MYSQL_DATABASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  }
): string {
  const connectionString =
    environment.MYSQL_DATABASE_URL ?? environment.DATABASE_URL;
  const message =
    "Configure MYSQL_DATABASE_URL with a mysql:// connection URL. This project requires MySQL; Replit's managed PostgreSQL DATABASE_URL is not compatible.";

  if (!connectionString) {
    throw new Error(message);
  }

  try {
    const url = new URL(connectionString);
    if (url.protocol !== "mysql:" || !url.hostname) {
      throw new Error(message);
    }
  } catch {
    // Do not include connection strings or credentials in configuration errors.
    throw new Error(message);
  }

  return connectionString;
}