---
name: Study UI before database
description: User-required order for restoring study sections and adding cross-device persistence
---

“Antes da gente fazer qualquer alteração dentro do nosso banco de dados do supabase, precisamos garantir primeiro que dentro da aplicação/plataforma, cada uma das seções sejam corretamente liberadas! E após suas correções, vamos fazer o escopo completo.”

**Why:** the user explicitly corrected the implementation order. The initial approval was for interface restoration, not immediate database changes.

**How to apply:** first restore and correct the section interfaces in the application. Do not create tables, change policies or provision storage for study data during this first phase. After the UI corrections, obtain approval for the complete persistence scope. Do not represent temporary UI interactions as durable cloud saves.

The user approved “Interações temporárias completas”: user-created data may
exist in browser memory for testing the full interfaces, but is discarded
on reload or logout. This is not approval to persist study data in localStorage.

**Why:** the user selected this approach after being told the retention limits.

**How to apply:** show those limits visibly; retain real authentication and
discard the temporary workspace on account changes as well.

## Single credential identity

The user requires “Credenciais de login com table única (Usuários)”.
Keep Supabase Auth as the single credential authority; study records should
reference that identity, not introduce a second password-based user system.

**Why:** the user explicitly asked for one credential table; duplicating
password storage would also add unnecessary security risk.

**How to apply:** use the managed `auth.users` identity for ownership in the
subsequent persistence phase. The user has now explicitly requested that
phase for users, exams, complete essays and live, precise Flows; the earlier
UI-first requirement is an order of work, not a permanent ban on Supabase.
