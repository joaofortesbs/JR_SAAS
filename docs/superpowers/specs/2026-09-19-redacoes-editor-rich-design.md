# Redações — Editor rico, partes e integração com Flows

## Objetivo e modo

Reconstruir integralmente a seção Redações da Central JR como uma experiência editorial persistente para estudantes. O modo é **Architectural / Feature** porque a mudança altera rotas, componentes, dados, contratos tRPC e o vínculo entre redações e sessões de estudo.

## Resultado do usuário

O estudante consegue criar uma redação, escrever em um editor rico, selecionar trechos sem perder a seleção, aplicar negrito, itálico, sublinhado, tachado e cor, categorizar trechos como partes da redação, acompanhar a cobertura percentual, organizar textos por tema e iniciar um Flow diretamente para estudar uma redação.

## Arquitetura

A navegação principal ganhará Redações. As rotas `/redacoes`, `/redacoes/nova` e `/redacoes/:essayId` deixarão de apontar para `Home.tsx` e passarão a usar um módulo próprio. O módulo será composto por biblioteca, editor, toolbar flutuante, painel de partes e estados assíncronos.

O editor usará `contentEditable` com HTML sanitizado e `document.execCommand` apenas para as operações de edição nativas suportadas pelo navegador, encapsuladas em comandos testáveis. A seleção será capturada antes de abrir a toolbar, e a ação será executada sobre a `Range` salva; após cada comando, a seleção será restaurada ou o caret será reposicionado de modo previsível. Cores serão aplicadas por `foreColor` e normalizadas para tokens permitidos. Partes serão persistidas em marcações semânticas com `data-part-id`, não apenas em estado local.

## Dados e invariantes

Será adicionado `essayParts`, contendo `id`, `userId`, `essayId`, `name`, `color`, `sortOrder` e timestamps. `studyBlocks` receberá `essayId` opcional. Toda consulta e mutação verificará ownership pelo `userId` autenticado. Uma parte deve pertencer à mesma redação do trecho que a referencia. Um Flow poderá estar associado a uma redação ou a uma prova; a criação exigirá exatamente um contexto.

O percentual de cada parte será calculado por caracteres de texto cobertos por marcações daquela parte dividido pelo total de caracteres significativos da redação. O cálculo será feito no servidor ou em helper compartilhado, ignorando tags HTML.

## API

Serão implementados ou ajustados os procedimentos `essays.list`, `essays.detail`, `essays.create`, `essays.update`, `essays.autosave`, `essays.createPart`, `essays.updatePart`, `essays.deletePart`, `essays.applyPart` e `flows.createAdHoc` com suporte a `essayId`. Erros estáveis incluem `ESSAY_NOT_FOUND`, `ESSAY_PART_NOT_FOUND`, `INVALID_ESSAY_CONTEXT` e `DATABASE_UNAVAILABLE`.

## UX e estados

A biblioteca terá busca, filtro por tema, ordenação recente, cards, contagem de palavras e indicador de cobertura. O editor terá título, tema, editor principal e painel lateral. A toolbar surgirá apenas com uma seleção não vazia e ficará acima do trecho quando houver espaço, reposicionando-se abaixo quando necessário. No mobile, o painel lateral se torna uma seção empilhada e a toolbar permanece horizontalmente rolável.

Estados obrigatórios: carregando, vazio, salvando, salvo, erro de autosave, erro de ação, redação inexistente, seleção vazia, parte sem trechos, conteúdo longo, teclado, foco visível e ausência de overflow. Ações de partes e Flow terão feedback de sucesso e erro.

## Critérios de aceitação

1. Ao selecionar um trecho, a toolbar aparece e cada ação afeta apenas o trecho selecionado.
2. Negrito, itálico, sublinhado, tachado e cor persistem após autosave e reload.
3. Aplicar uma parte colore o trecho com o token da parte e atualiza sua cobertura percentual.
4. A seleção não salta para o início nem aplica formatação ao restante do documento.
5. Redações podem ser filtradas e organizadas por tema.
6. Uma redação aparece no seletor de contexto do Flow e cria uma sessão vinculada ao `essayId`.
7. Usuários não conseguem ler ou alterar redações, partes ou blocos de outro usuário.
8. O fluxo anterior baseado em provas continua funcionando.
9. Typecheck, suíte Vitest, integração tRPC, build e smoke visual desktop/mobile passam.

## Fora de escopo

Colaboração simultânea, comentários, revisão por IA, exportação DOCX/PDF, histórico visual de cada tecla e editor baseado em pacote externo completo ficam fora deste ciclo.

## Arquivos previstos

`drizzle/schema.ts`, migração nova, `server/db.ts`, `server/routers.ts`, testes de integração, `client/src/App.tsx`, `client/src/components/AppShell.tsx`, `client/src/pages/Essays.tsx`, componentes editoriais dedicados, estilos em `client/src/index.css` e `todo.md`.
