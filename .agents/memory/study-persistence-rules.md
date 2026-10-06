---
name: Study persistence rules
description: Approved product semantics for persistent exams, essays and Flows
---

Flows continue while officially running, including after reload, logout or
changing devices. Logout clears private UI state; it does not pause a Flow.
Paused time is excluded, and each account has at most one running or paused
session. The database is the authority for execution periods and durations.

**Why:** the user approved the cross-device, precise live Flow design;
browser tick counters cannot provide those guarantees.

**How to apply:** do not cancel sessions on logout or derive official study
time from browser intervals. Preserve fractions across pause/resume transitions.

Essay versions preserve the text and its personalized structure, not just
the body text.

**Why:** the user asked for all data and personalizations in each essay and
approved versions that recover those personalizations.

**How to apply:** history and restoration must include names, colors and
ordering of parts together with the content and metadata.

Normal application requests use the user's authenticated identity and database
ownership protection, not administrative credentials.

**Why:** the approved design requires private studies without a privileged
backend key bypassing their access rules.

**How to apply:** administrative access is for schema preparation and
verification. Keep private queries, pending reads and subscriptions isolated
when accounts change.

Bind both cached study queries and queued commands to the intended account,
even when the provider itself is remounted on account changes.

**Why:** effect cleanup can run after a new account's first render, while
delayed writes can obtain that new account's SDK token. A keyed provider alone
does not prevent a stale private render or an old draft being created under
the wrong account.

**How to apply:** include the intended UUID in cache keys and commands, verify
it against the authenticated identity before querying or writing, and discard
that account's pending UI state on logout. Dirty essay revisions stay tied to
the draft's base revision, not a newer revision received from another device.
