---
name: Netlify static hosting
description: User-confirmed production hosting constraint and public authentication configuration
---

Production at https://central-jr.netlify.app is a static Netlify SPA, without a
continuous Express server.

**Why:** the user confirmed this hosting model when reporting a production
authentication failure caused by a missing same-origin configuration endpoint.

**How to apply:** bootstrap browser authentication from public Vite build
variables, not an Express configuration endpoint. Environment changes require
a new Netlify build. Never expose administrative credentials to the browser.
Before promising full production functionality, check that any separate
backend-dependent features are actually available on the static host.

Temporary static-preview servers can leave automatic port mappings in `.replit`
after they stop. Remove only the temporary mapping using validated configuration
replacement, not direct edits.

**Why:** a static-build verification registered an unrelated persistent port;
stopping the preview alone did not clean it up.
