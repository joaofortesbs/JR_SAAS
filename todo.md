# Central JR — Checklist da plataforma

## Base já entregue

- [x] Rebranding completo para Central JR no shell, título, paleta, tipografia e cópias visíveis.
- [x] Tokens semânticos azul-marinho, azul, rosa, superfícies e estados light/dark aplicados.
- [x] Sidebar com Painel, Provas, Redações e Flows; preferências e conta no perfil.
- [x] Provas com cadastro, edição, encerramento e conteúdos.
- [x] Flows com cronômetro persistente, pausa, retomada, cancelamento e gráfico sob demanda.
- [x] Painel consolidado com métricas, próxima prova, próximo movimento e redações.

## Reconstrução de Redações — concluída

- [x] Removida a tela/editor legado de Redações de `Home.tsx`.
- [x] Criada a biblioteca com busca, filtro por tema, estados vazio/loading/erro e cards de redação.
- [x] Criado o fluxo de nova redação com onboarding curto e proposta de valor clara.
- [x] Criado editor rico baseado em `contentEditable` com seleção persistente por `Range`.
- [x] Toolbar flutuante funcional com negrito, itálico, sublinhado, tachado e cor do texto.
- [x] Criado painel lateral de partes com categorias customizáveis, cores, edição e exclusão.
- [x] Aplicação de parte ao trecho selecionado com `data-part-id`, cor visual e cobertura percentual.
- [x] Autosave com debounce e salvamento manual de versão.
- [x] Sanitização server-side de HTML permitido para reduzir risco de conteúdo inseguro.
- [x] Ownership por usuário em detalhe, autosave, partes, aplicação de parte e Flow.
- [x] Migração `0005_dashing_rawhide_kid` gerada e aplicada ao banco.
- [x] `studyBlocks.essayId` criado para vínculo persistente entre redação e Flow.
- [x] CTA “Estudar em um Flow” cria e inicia imediatamente o Flow associado.
- [x] Seletor de Flow atualizado para incluir redações revisáveis.

## Qualidade

- [x] Testes unitários de sanitização, contagem e cobertura de partes.
- [x] Teste de integração tRPC cobrindo criação, autosave, versão, parte, cobertura e Flow associado.
- [x] TypeScript sem erros.
- [x] Suíte Vitest completa: 7 arquivos, 13 testes aprovados.
- [x] Build de produção aprovado.
- [x] Preview desktop e mobile de biblioteca e criação validadas.

## Próxima fatia recomendada

- [x] Adicionar feedback inline/contextual da professora, ancorado ao trecho selecionado dentro do editor.
- [x] Implementar exportação da redação para PDF/HTML.
- [x] Adicionar ordenação manual de partes via drag-and-drop com fallback por botões para teclado e touch.
