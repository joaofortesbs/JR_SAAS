# Central JR

Imported application using React 19, Vite, Express, tRPC, Drizzle and MySQL.
Keep the existing repository structure, pnpm lockfile, MySQL schema and OAuth
provider. Do not migrate the database or authentication system without approval.

## Run on Replit

- Node.js 20.20 or newer compatible runtime; pnpm 10.
- The `Start application` workflow runs `PORT=5000 pnpm dev`.
- Express serves the API and Vite frontend together on port 5000.
- Vite's middleware configuration already allows Replit preview hosts.
- `pnpm check` checks TypeScript.
- `pnpm test` runs unit and MySQL integration tests. Integration tests require a
  reachable **development** MySQL database with the application's schema. They
  create and clean up test records; do not point them at production.
- `pnpm build` builds the frontend and server. Run the built server with
  `PORT=5000 pnpm start`.

## Required external configuration

### Database

Provide `MYSQL_DATABASE_URL` through Replit Secrets, using the existing
MySQL-compatible database and a `mysql://` connection URL. The existing
`DATABASE_URL` remains supported only when it is a MySQL URL. Replit's
runtime-managed PostgreSQL `DATABASE_URL` is not compatible with this schema and
must not be repurposed or replaced.

The server and Drizzle CLI share connection validation. Use `pnpm db:push` only
after confirming the target database and reviewing the generated migrations.
No schema migrations are run automatically at startup.

### Authentication

The existing OAuth provider requires these non-secret settings:

- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`
- `OAUTH_SERVER_URL`

Register the running app's `/api/oauth/callback` URL with that provider.
Session signing uses `JWT_SECRET` when supplied, otherwise the existing
`SESSION_SECRET`. Never commit or log these secret values.

### Optional services

- Analytics loads only when both `VITE_ANALYTICS_ENDPOINT` and
  `VITE_ANALYTICS_WEBSITE_ID` are configured.
- Essay file uploads require the existing storage service:
  `BUILT_IN_FORGE_API_URL` and secret `BUILT_IN_FORGE_API_KEY`.
- Other Forge/Maps template utilities are not needed to start the server or
  render the login screen.