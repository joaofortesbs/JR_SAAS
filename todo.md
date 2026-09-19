# Ponto Estudos — Checklist da reconstrução

## Concluído

- [x] Sidebar reduzida para Painel, Provas e Flows.
- [x] Redirecionamento de Hoje/Evolução para Painel.
- [x] Redirecionamento de Plano para Flows.
- [x] Redações e Biblioteca reposicionadas em Mais ferramentas.
- [x] Minha rotina e Preferências movidas para o menu de perfil.
- [x] Provas com cadastro de nome, prazo, instituição, prioridade e observação.
- [x] Grid responsivo de provas com estados Ativas e Histórico.
- [x] Edição e encerramento de provas com preservação do histórico.
- [x] Detalhe de prova com prazo, cobertura, conteúdos, blocos e redações.
- [x] Flow com seleção de bloco planejado ou prova para sessão avulsa.
- [x] Sessão persistente com estados running, paused, completed e cancelled.
- [x] Retomada segura do cronômetro após refresh.
- [x] Gráfico de linha de minutos concluídos nos últimos sete dias.
- [x] Painel consolidado com métricas, próxima prova, próximo movimento e redações.
- [x] Migrações 0003 e 0004 aplicadas ao banco.
- [x] TypeScript, testes Vitest e build de produção validados.
- [x] Smoke test visual desktop/mobile das rotas Painel, Provas e Flows.

## Pontos de atenção futuros

- [ ] Adicionar testes de integração tRPC contra banco para start/pause/resume/complete.
- [ ] Criar edição de conteúdos diretamente no detalhe da prova.
- [ ] Adicionar confirmação acessível antes de encerrar prova ou cancelar Flow.
- [ ] Dividir o bundle de gráficos via lazy loading se o produto crescer.
