---
name: Dependency firewall recovery
description: Recovering imported pnpm dependencies when several old versions are blocked by Replit's package firewall.
---

When package installation reveals multiple blocked dependencies, upgrade the
affected direct packages or their direct parents together in one installation
request after trying current releases. Do not bypass the package firewall.

**Why:** Failed pnpm add transactions do not persist the requested upgrades.
Updating one blocked parent at a time can repeatedly resolve another old,
blocked package and prevent every transaction from succeeding.

**How to apply:** Track the distinct direct parents named in installation
failures, request their current compatible releases together, and verify the
application after the installation completes. A newly blocked dependency is a
different recovery target, not a reason to retry the same unchanged request.