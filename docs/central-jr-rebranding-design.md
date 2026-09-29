# Central JR — Pesquisa e direção de rebranding

**Status:** proposta para revisão antes da implementação

## 1. Diagnóstico

O pedido superficial é trocar “Ponto Estudos” por “Central JR” e substituir o roxo por azul-marinho e rosa. O problema real é mais amplo: a plataforma precisa de uma identidade que comunique **acolhimento educacional, confiança e clareza de próximo passo** sem parecer infantil, genérica ou visualmente dependente de um único acento cromático.

A recomendação é posicionar a Central JR como **a plataforma que acolhe, orienta e torna o progresso visível**. Promessa sugerida: **“Aprenda no seu ritmo. Saiba sempre o próximo passo.”**

## 2. Achados da pesquisa

Duolingo demonstra o valor de progresso visível, unidades curtas, estados compreensíveis, CTAs concretos e personalidade concentrada em ilustrações e celebrações. A lição não é copiar mascote, humor ou paleta, mas tornar a evolução legível e motivadora.

Canvas demonstra a importância de contexto, navegação persistente, cartões com identidade, personalização e acessibilidade configurável. A Central JR deve aprender com essa clareza sem reproduzir sua navegação, nomenclatura, logo ou combinação visual.

Notion demonstra como um sistema composável transforma uma promessa ampla em blocos, views e ações. Para a Central JR, isso significa componentes reutilizáveis e uma Home orientada ao próximo passo, não uma cópia da sidebar ou do visual monocromático.

Linear demonstra disciplina de hierarquia, estados, nomenclatura, densidade controlada e progressão de “simples primeiro, poderoso depois”. Essa lógica deve ser adaptada para reduzir ansiedade e apoiar aprendizagem, não para importar sua estética operacional escura.

Cal.com demonstra clareza de promessa, CTA principal, whitespace, tipografia em camadas, temas e estados completos de componentes. A Central JR deve absorver o rigor do sistema, não seus assets, logo ou tipografia proprietária.

Headspace demonstra como acolhimento pode coexistir com credibilidade, conteúdo por intenção e uma personalidade em camadas. A Central JR pode reconhecer dúvida, esforço, pausa e conquista sem infantilizar o estudante nem copiar seus personagens, laranja ou linguagem de saúde mental.

## 3. Sistema de cores proposto

Os valores abaixo são **tokens iniciais da Central JR**, não cores atribuídas às marcas pesquisadas. Devem passar por validação de contraste antes do lançamento.

| Token | Valor | Função |
|---|---:|---|
| Navy 900 | `#15253D` | Texto primário, títulos, navegação e estrutura |
| Navy 700 | `#244366` | Estrutura secundária, ícones e superfícies profundas |
| Blue 700 | `#1559B7` | Links, foco e ações no tema claro |
| Blue 600 | `#1769D2` | Progresso e ações de maior destaque |
| Blue Dark | `#10458D` | Hover, pressed e links de maior contraste |
| Pink 700 | `#C52F78` | Acolhimento, celebração, vínculo e destaque editorial |
| Pink 100 | `#FCE7F3` | Superfície suave de acolhimento e celebração |
| Canvas | `#F7F9FC` | Fundo geral claro |
| Surface | `#FFFFFF` | Cards, campos e superfícies elevadas |
| Surface Subtle | `#EEF3FA` | Agrupamentos e seleções suaves |
| Border | `#D7E0EC` | Divisores e contornos secundários |
| Dark Canvas | `#0E1726` | Fundo do tema escuro |
| Dark Surface | `#15243A` | Card escuro |
| Dark Elevated | `#1D304A` | Card elevado, popover e destaque |
| Dark Border | `#36506D` | Divisor e contorno escuro |

O **rosa não será o botão principal de toda a plataforma**. Ele será usado como acento humano, celebração, vínculo, ilustração ou destaque editorial. Estados de sucesso, alerta e erro terão tokens próprios e nunca dependerão apenas do rosa.

## 4. Estados semânticos

- **Sucesso:** texto/ícone `#167A52`, superfície `#E8F7F0`.
- **Aviso:** texto `#8A4B08`, superfície `#FFF4DE`.
- **Erro/perigo:** texto `#B42318`, superfície `#FDECEB`.
- **Informação:** texto `#1559B7`, superfície `#E9F1FF`.
- **Selecionado:** fundo `#E9F1FF`, indicador lateral ou underline e rótulo persistente.

Cada estado também terá texto, ícone ou forma. Cor nunca será o único canal de comunicação.

## 5. Tipografia e personalidade

A proposta inicial é **Plus Jakarta Sans** para títulos e chamadas e **Source Sans 3** para corpo, navegação, instruções e dados, com fallbacks sans-serif. Se duas famílias aumentarem complexidade ou peso de carregamento, Source Sans 3 poderá ser usada em todo o produto.

A personalidade aparece em títulos de descoberta, ilustrações originais e celebrações opcionais. Instruções, avaliações, dados, navegação e mensagens de erro permanecem precisos e legíveis.

Escala inicial: display 48/52 desktop e 36/40 mobile; H1 32/38; H2 24/30; H3 20/26; corpo 16/24; metadados 14/20.

## 6. Regras de componentes

A navegação manterá poucos destinos estáveis e indicação clara de localização. Cada contexto terá um CTA primário, uma ação secundária e ajuda acessível.

Cards de atividade exibirão título, objetivo, nível, duração, status, autor/professor quando relevante e ação primária. Cards não serão usados apenas para decoração.

Progressos mostrarão etapa atual, total ou porcentagem e próximo passo. Revisão contará como avanço. Estados novos, em andamento, revisão, concluído, pausado, bloqueado, erro, offline, carregando e desabilitado terão conteúdo explicativo.

Botões terão estados default, hover, pressed, focus, disabled, loading, success e error. O loading preservará a largura do botão e informará o que está acontecendo.

Alertas explicarão causa, impacto e próxima ação. Formulários terão labels persistentes, erros junto ao campo e preservação da entrada.

Celebrations serão proporcionais, silenciosas por padrão ou desligáveis. Movimento respeitará `prefers-reduced-motion`.

## 7. Plano de aplicação

1. Criar tokens semânticos de cor, tipografia, foco, superfície, borda e estado.
2. Remover nomes e cópias visíveis de Ponto Estudos/Ponto School e substituí-los por Central JR.
3. Migrar sidebar, topbar, cards, botões, pills, progressos, gráficos e estados para tokens.
4. Atualizar light/dark mode sem inversão automática de HEX.
5. Auditar ocorrências restantes de roxo e valores hardcoded.
6. Validar todos os componentes em desktop, mobile, zoom, teclado, reduced motion e textos longos.
7. Executar typecheck, testes, build, contraste e screenshots das rotas Painel, Provas, Flows e rotas legadas.

## 8. Riscos

Os HEX são hipóteses iniciais e devem ser recalculados por componente. Duas famílias tipográficas precisam ser validadas para cobertura de idiomas e estabilidade de carregamento. A migração gradual pode deixar telas inconsistentes; novos HEX fora dos tokens devem ser bloqueados. Modo escuro, estados disabled e texto secundário exigem atenção especial.

## 9. Fontes pesquisadas

- [Duolingo](https://www.duolingo.com/) e [Duolingo Efficacy](https://www.duolingo.com/efficacy)
- [Duolingo — core tabs redesign](https://blog.duolingo.com/core-tabs-redesign/)
- [Duolingo — shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/)
- [Canvas](https://www.instructure.com/canvas)
- [Canvas Theme Editor](https://community.instructure.com/en/kb/articles/387083-canvas-theme-editor-components)
- [Canvas Global Navigation](https://community.instructure.com/en/kb/articles/662861-how-do-i-use-the-global-navigation-menu)
- [Notion About](https://www.notion.com/about) e [Notion Sidebar](https://www.notion.com/help/navigate-with-the-sidebar)
- [Linear Brand](https://linear.app/brand) e [Linear Workflows](https://linear.app/docs/configuring-workflows)
- [Cal.com Design](https://design.cal.com/) e [COSS UI](https://coss.com/ui/docs)
- [Headspace](https://www.headspace.com/) e [Headspace Brand Refresh](https://italic-studio.com/projects/headspace/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Decisão solicitada

Aprovar esta direção de tokens, tipografia, estados e regras de componentes antes da implementação no código existente.
