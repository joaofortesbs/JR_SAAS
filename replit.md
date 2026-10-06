# Central JR

React/Vite, Express, tRPC and pnpm. Central JR is the active brand; preserve its
existing tokens, typography, primitives and light/dark themes.

## Run

- Node.js 22+ (required by the pinned Supabase SDK), pnpm 10.
- Existing workflow: `Start application`, `PORT=5000 pnpm dev`.
- Express serves the API and Vite together; Replit preview hosts are permitted.
- `pnpm check`, `pnpm test`, `pnpm build`.
- `PORT=5000 pnpm start` serves the built app.

After task merges, `scripts/post-merge.sh` restores dependencies from the
lockfile, checks TypeScript and builds the app. It runs without prompts and
never migrates databases or changes external Supabase settings.

## Authentication only

Supabase Auth in an **external** project owns accounts and sessions. Supply
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` through Replit Secrets. Only HTTPS
project URLs and `sb_publishable_...` keys are accepted. The no-store
`/api/auth/config` endpoint exposes exactly these public values at runtime.
No privileged key, database password or application JWT is needed.

The browser SDK persists and renews sessions; tRPC sends its access token.
Express creates a stateless client per request and validates tokens with
Supabase `getUser(token)`. UUID identities never become old numeric IDs.
Editable name metadata is presentation only, never administrative authority.
Account changes cancel and clear query caches. Logout uses Supabase signOut.
Legacy cookies and mirrored tokens are neither read nor accepted.

Routes: `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`,
`/auth/callback`, protected `/painel` and `/conta`. Login and confirmed signup
enter `/painel` directly with the platform sidebar; `/` redirects to `/painel`.
`/conta` is secondary and its Início card returns to `/painel`.
Callback data is removed from the URL
before rendering. Reset requires verified recovery; a normal sign-in is not
enough. Reloading the reset screen loses the in-memory recovery grant; request
a new recovery link. PKCE confirmation/recovery must be opened in the browser
where requested. Expired/reused links display a request-new-link state.

### Configure the external project's Auth dashboard

1. Enable Email/password sign-up; require **Confirm email**.
2. Set Site URL to the intended app origin and allow its exact
   `/auth/callback` redirect URL. For development use the actual Replit preview
   origin, not localhost. Register the eventual published origin separately
   after an authorized deployment; do not infer a published URL.
3. Supabase's standard email templates using ConfirmationURL support PKCE.
   The pinned SDK can append `sb_flow_id` to callbacks. Preserve query parameters
   in email links and use the documented redirect matching rules.
4. Optional cross-browser email templates can link to
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` for confirmation,
   and `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` for recovery.
   If RedirectTo already contains a query, use `&` rather than `?` or use an
   exact fixed application callback URL approved for that environment.
   The app validates hashes with `verifyOtp`, with an allowlist of types.
   Change templates only with project-owner authorization.
5. Configure your chosen SMTP service in Supabase Auth SMTP for real users.
   Default SMTP is team-only, best-effort, with restrictive rate limits; it
   does **not** establish general deliverability. Configure sender-domain
   SPF/DKIM/DMARC with that service and review Auth rate limits.
6. Never put SMTP credentials or email links/tokens in chat, logs or repository.

`pnpm exec tsx scripts/check-auth-config.ts` checks connectivity and publicly
visible Email/confirmation settings, returning only booleans/statuses. This
cannot inspect SMTP or the redirect allowlist and is not an end-to-end test.
No external project settings, schemas or accounts are changed automatically.

## Temporary study interfaces — no external database changes

The user requires all study interfaces to be restored and corrected **before**
any external Supabase study database or storage changes. In this first phase,
the user approved complete temporary interactions in browser memory only.
There are no seeded examples, browser-storage study records or cloud saves.
A visible notice explains that reloading, logout or changing account discards
this temporary workspace.

`StudyProvider` creates an account-keyed in-memory workspace; the `study`
hooks operate only on that workspace, separately from the real authenticated
tRPC client. Original study interfaces use these hooks for exams, topics,
routine, planning, Flows, resources and essay editing. Pure planning and time
helpers do not connect to a database. The account and authentication remain
real Supabase Auth features.

The backend study APIs remain disconnected. All former domain tRPC procedures first
require authentication, then return SERVICE_UNAVAILABLE. Uploads return 401
without authentication and 503 with valid authentication. Retired OAuth and
storage APIs return 404. No MySQL, Forge or notification handler is imported
by the running server. No analytics or debug collector runs on auth pages.

The original MySQL schema and repository helpers remain for future review,
but are not imported at runtime. Study interfaces are included in TypeScript
checks and build again, using explicit temporary contracts.
The old MySQL integration suites are explicitly excluded from the Auth-only
test run. Passing current tests makes **no claim** about old persistence.
Do not migrate, copy or delete external data/accounts, provision study tables,
change policies or create Supabase Storage buckets in this phase. The user
chose Supabase for eventual cross-device persistence, but the full scope
requires approval **after the interface corrections**. Do not repurpose
Replit PostgreSQL.

## Verification limits

`pnpm test:ui` includes public flows and explicitly controlled-session tests
of login-to-Painel, sidebar, reload, module/account navigation and logout.
Controlled responses are test-only and do not validate external email flows.
Run local checks and UI tests, then verify real authorized signup,
email delivery/confirmation, login, reload, refresh, password recovery and
logout using an owner-approved inbox. Until that is done, the complete
external email flow is **not validated**. SMTP, redirect configuration or
missing inbox access must be reported as blockers, not masked by mocks.

Documentation consulted 2026-10-02:
- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/auth/choosing-a-server-package
- https://supabase.com/docs/reference/javascript/auth-getuser