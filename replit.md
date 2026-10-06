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

## Approved external Supabase study persistence

UI restoration was completed first. The user subsequently approved the complete
specification in `docs/superpowers/specs/2026-10-05-supabase-study-persistence-design.md`
and authorized its migrations in the existing external Supabase project.
Native `auth.users` remains the ONLY credential authority. No password or
duplicate user table, Replit database replacement, or legacy MySQL migration.

`server/study.ts` handles authenticated `study.snapshot` and `study.mutate`.
Each account-bound request forwards only the publishable key and verified JWT.
Explicit grants/RLS and composite owner foreign keys protect every study table.
The frontend facade keeps existing domain interfaces and reconciles through
Realtime/focus/periodic authoritative snapshots, without fake successful saves.
Request IDs deduplicate mutations; revisions protect essay and Flow changes.

Exams/topics, essays/parts/manual feedback/full snapshots, generated planning
blocks, Flow sessions and execution periods use `public.jr_*` tables. Official
Flow timestamps and millisecond durations can only be changed through the narrow
owner-checked command in the non-exposed `jr_private` schema. At most one running
or paused Flow per account; logout/reload/device switches do NOT pause it.
Paused intervals do not count. Full essay restoration includes personalization.
Autosaves serialize writes, keep dirty drafts on failure and use base revisions.

Routine windows/commitments and library resources/previews are still temporary
account-isolated browser memory and explicitly labeled. Planning validates those
temporary inputs but persists resulting blocks. Uploads/buckets remain excluded.
Retired domain routes remain unavailable for authenticated calls. Old storage
and OAuth routes are not reactivated. No MySQL/Forge handler runs in the app.

`pnpm supabase:migrate` is an EXPLICIT administrative command using the scoped
`SUPABASE_ACCESS_TOKEN`. It applies and records CLI-created migrations through
the Management API and aligns local filenames with official migration versions.
It is NEVER called by application startup, publishing, or post-merge setup.
`pnpm test:db` runs a real, rolled-back transaction under synthetic authenticated
identities to verify RLS, references, versions and server-clock lifecycle rules.
It creates no native Auth account and changes no personal study record.
Old MySQL integration suites remain excluded; `db:push` is a legacy MySQL command
and must NOT be used for this external Supabase implementation.

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