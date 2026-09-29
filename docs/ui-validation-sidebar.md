# Validação visual — Sidebar e perfil

Data: 2026-09-19

A sidebar foi verificada nas rotas `/`, `/provas` e `/flows` em viewport desktop de 1440x900. O card de perfil aparece no topo com avatar circular, nome do usuário e identificação de perfil. Painel, Provas e Flows são os únicos itens de navegação primária e o estado ativo é destacado com fundo lilás suave.

A versão mobile foi verificada em 390x844 nas rotas `/` e `/provas`. O conteúdo não apresenta overflow horizontal; o cabeçalho exibe o acionador de menu e o layout principal se empilha corretamente. O drawer usa backdrop e possui fechamento por botão e tecla Escape no código.

A integração do AppShell foi corrigida em `client/src/App.tsx`; a página `Home` deixou de montar um AppShell duplicado.
