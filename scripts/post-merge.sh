#!/usr/bin/env bash
set -euo pipefail

# Restore the exact merged dependencies without changing the lockfile.
CI=true pnpm install --frozen-lockfile
pnpm check
pnpm build

# Auth-only scope: never run database migrations or mutate external services.
