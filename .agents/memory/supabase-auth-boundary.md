---
name: Supabase Auth boundary
description: Product scope and a callback-cleanup constraint when using Supabase Auth
---

Capture PKCE callback correlation parameters before cleaning the URL.

**Why:** newer Supabase SDKs support concurrent PKCE flows and use a flow ID to
select the stored verifier. Removing that query parameter before exchange
can select no verifier or the wrong pending flow.

**How to apply:** pass the captured flow ID to the documented exchange API;
never log callback codes, hashes, tokens or verifier material.