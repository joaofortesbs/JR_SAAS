---
name: Study UI before database
description: User-required order for restoring study sections and adding cross-device persistence
---

“Antes da gente fazer qualquer alteração dentro do nosso banco de dados do supabase, precisamos garantir primeiro que dentro da aplicação/plataforma, cada uma das seções sejam corretamente liberadas! E após suas correções, vamos fazer o escopo completo.”

**Why:** the user explicitly corrected the implementation order. They chose Supabase for eventual cross-device study persistence, but did not approve immediate database changes.

**How to apply:** first restore and correct the section interfaces in the application. Do not create tables, change policies or provision storage for study data during this first phase. After the UI corrections, obtain approval for the complete persistence scope. Do not represent temporary UI interactions as durable cloud saves.
