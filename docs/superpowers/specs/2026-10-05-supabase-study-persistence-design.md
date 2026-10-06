# Central JR — persistência de estudos no Supabase externo

> Escopo atualizado por aprovação do usuário: Plano semanal e Biblioteca foram
> removidos da plataforma, incluindo geração de planos e relações de recursos.
> Referências abaixo a essas funcionalidades descrevem o desenho histórico,
> não autorizam sua reintrodução. Contextos e históricos dos Flows foram
> preservados. O estado atual da aplicação está documentado em `replit.md`.

## 1. Objetivo e aprovação

Substituir o armazenamento temporário de provas, redações e Flows por
persistência privada no projeto Supabase externo já usado pelo login.
O usuário aprovou esse desenho após a restauração das interfaces.

Esta especificação detalha o desenho aprovado para revisão antes das migrações.
Não representa implementação ou comprovação de salvamento.

### Fatos verificados

- O login atual usa Supabase Auth.
- A tabela gerenciada `auth.users` existe.
- A inspeção dos catálogos não encontrou tabelas, funções ou políticas de
  estudo em `public`, nem tabelas na publicação `supabase_realtime`.
- As consultas de inspeção não leram registros pessoais ou alteraram dados.
- O projeto local usa React, Express, tRPC e Supabase JS; essas escolhas serão
  preservadas.
- O token administrativo fica em Secrets e não será enviado ao navegador.

## 2. Escopo

### Incluído

1. Identidade e credenciais gerenciadas exclusivamente pelo Supabase Auth.
2. Provas e tópicos, com criação, edição, encerramento e exclusão autorizada.
3. Redações completas: conteúdo, metadados, estrutura personalizada,
   versões e avaliações manuais.
4. Blocos utilizados pelos Flows, sessões, períodos de execução e histórico.
5. Retomada entre dispositivos, sincronização de estados e controles contra
   concorrência e repetição de comandos.
6. Estados visíveis de carregamento, salvamento, erro, conflito e reconexão.

### Fora do escopo

- Persistência da rotina e biblioteca; continuam explicitamente temporárias.
- Uploads de arquivos, criação de buckets e armazenamento de anexos:
  o editor atual não possui um fluxo de anexos persistentes de redação.
- Correção automática por IA ou integração com professores.
- Compartilhamento público, contas administrativas e alterações de cobrança.
- Migração do MySQL legado ou criação de um banco Replit substituto.
- Redesenho visual, substituição de frameworks ou mudança dos fluxos de login.

Rotina e biblioteca não poderão bloquear o uso de Flows avulsos a partir de
provas e redações persistidas. Ao gerar um plano, as janelas temporárias serão
enviadas como entrada validada, sem serem apresentadas como salvas no Supabase.
Os blocos gerados para execução serão persistidos.

## 3. Arquitetura

### Escolha

Usar registros relacionados por entidade e usuário, em vez de guardar toda a
conta em um único documento JSON. Isso permite validar referências,
aplicar proteção por registro e atualizar uma sessão sem sobrescrever outros
estudos do usuário.

Manter tRPC como integração entre as interfaces existentes e a camada de
serviço/repositório. O servidor acessará Supabase com a chave pública e o
JWT do usuário autenticado, preservando as regras do banco.

O acesso administrativo será exclusivo da preparação e verificação do
esquema, nunca uma dependência das requisições normais da aplicação.

### Contratos

- Contratos de entrada e saída compartilhados e tipados, com validação.
- UUID do Supabase Auth para propriedade; IDs numéricos de estudos para
  preservar as rotas e interfaces existentes.
- Mapeamento explícito de datas, enumerações e nomes dos campos entre banco
  e aplicação. Não reutilizar o repositório MySQL como fallback.
- Hooks temporários permanecem somente nos módulos fora do escopo.
- Queries e assinaturas privadas isoladas por conta; encerrar assinaturas,
  cancelar leituras pendentes e descartar caches ao sair ou mudar de usuário.
- Nenhuma falha de persistência será convertida em um falso sucesso local.

## 4. Modelo de informação

Os nomes finais serão definidos na migração; este é o contrato de conteúdo.

### Usuários

`auth.users` continua sendo a única autoridade de identidade e credenciais.
Não criar cópia de senha, hash, tokens ou uma segunda tabela de login.
O nome de apresentação pode continuar nos metadados já usados pela aplicação,
mas metadados editáveis pelo usuário nunca autorizam acesso.

### Provas e tópicos

- Prova: dono, nome, instituição, data, fase, prioridade, cor, observações,
  estado e datas de criação/alteração.
- Tópico: dono, prova, nome, matéria, peso, estado e datas.
- Estados atuais dos tópicos: não iniciado, em andamento, revisão,
  precisa de ajuda e concluído.
- Progresso calculado a partir dos tópicos reais, sem percentuais fictícios.
- Arquivar/encerrar uma prova preserva seu histórico.
- Excluir exige confirmação; não permitir exclusão com um Flow ativo.
- Referências associadas só podem apontar a registros do mesmo dono.

### Redações

- Dono, prova associada opcional, título, tema, banca, origem, estado,
  conteúdo formatado, nota e datas.
- Partes: vínculo com a redação, nome, cor, ordem e vínculo com trechos
  do texto. Não perder marcações ao recarregar.
- Versões: número, data, origem e snapshot do texto, metadados e partes.
  Restaurar uma versão recupera também sua estrutura personalizada.
- Avaliações: origem informada manualmente, notas por competência,
  nota total, observações e data.
- Validar limites e intervalos de notas; não simular avaliação automática.
- Sanitizar HTML no serviço e na renderização/exportação. Não preservar
  scripts, atributos executáveis ou estilos inseguros.
- Autosave de 900 ms, com operações ordenadas por redação e controle de
  revisão. Uma resposta atrasada não pode sobrescrever uma edição recente.
- Edições concorrentes entre dispositivos produzem conflito explícito.
  Manter o rascunho atual disponível para o usuário decidir como recuperar,
  em vez de sobrescrever silenciosamente.
- A navegação interna aguarda a confirmação de alterações pendentes ou
  informa a falha. Em fechamento/reload com alteração não confirmada,
  advertir o usuário; não prometer entrega garantida após fechar a aba.

### Flows

- Bloco: dono, prova/redação, tópico opcional, título, tipo, datas/horários,
  duração planejada, estado, motivo e versão mínima.
- Sessão: dono, bloco, estado, início, fim, duração acumulada e revisão.
- Períodos: início e fim de cada intervalo em execução, pertencentes à sessão.
- Histórico inclui sessões concluídas e canceladas, com suas durações reais.
  Sessões canceladas não contam como sessões concluídas.
- Preservar um Flow ativo após reload, logout ou troca de dispositivo.
  Sair da conta limpa a tela, mas não pausa o cronômetro.

## 5. Regras do cronômetro e sincronização

- Horários oficiais vêm do banco em UTC; apresentação usa o fuso do usuário.
- Guardar duração com precisão de milissegundos. Exibir horas, minutos e
  segundos, sem arredondar cada pausa nem atribuir um minuto fictício a
  uma sessão muito curta.
- Acumular somente os períodos em execução; pausas não contam.
- O cronômetro continua enquanto o estado oficial for em execução,
  mesmo com a aba em segundo plano ou a aplicação fechada.
- Uma conta pode ter no máximo uma sessão em execução ou pausada.
  Garantir isso no banco, inclusive para inícios simultâneos.
- Iniciar, pausar, retomar, concluir e cancelar são operações atômicas,
  com validação do estado anterior, revisão e dono.
- Identificadores de comando permitem repetir uma requisição cuja resposta
  foi perdida sem iniciar duas sessões ou contar tempo duas vezes.
- Não aceitar horários ou duração oficial fornecidos pelo navegador.
- A tela recebe estado, duração acumulada e referência de horário do servidor.
  Entre confirmações, atualiza a exibição localmente; não escreve por segundo.
- Realtime comunica mudanças do estado. Reconexão, retorno à aba e revisão
  periódica recuperam a referência oficial, inclusive se um evento se perder.
- Sem rede, indicar que o estado não foi confirmado; nunca exibir “pausado”
  ou “concluído” só porque o botão foi clicado.

## 6. Segurança e integridade

- RLS habilitada em todas as novas tabelas expostas.
- Sem acesso anônimo aos dados de estudo.
- Leituras e escritas vinculadas à identidade verificada do usuário.
- Políticas de atualização validam tanto o dono atual quanto o resultado.
- Chaves estrangeiras compostas impedem associar estudos de contas diferentes.
- Índices nas colunas de propriedade e filtros frequentes.
- Fluxos de escrita do cronômetro não permitem edição direta de timestamps,
  duração acumulada ou períodos pelo cliente.
- Preferir funções que respeitam o papel do chamador. Quando comandos
  protegidos precisarem de privilégios elevados para impedir escrita direta,
  manter a implementação em esquema não exposto, validar `auth.uid()`,
  fixar o caminho de resolução, revogar execução pública e expor somente
  comandos específicos autenticados.
- Configurar os privilégios da API explicitamente, além das políticas RLS.
- Realtime usa sessão autenticada e proteção de propriedade; um filtro de
  assinatura não substitui autorização.
- Não registrar JWTs, senhas, valores de Secrets ou conteúdo privado em logs.
- Revisar alertas de segurança depois das alterações.

## 7. Interface e recuperação

Preservar layout, rotas, identidade Central JR e responsividade existentes.

| Situação | Comportamento |
|---|---|
| Carregando dados | Indicador de carregamento; não mostrar “vazio” prematuramente |
| Nenhum registro | Estado vazio real com ação de criar |
| Salvamento em andamento | Estado pendente, sem sucesso antecipado |
| Salvamento confirmado | Indicar salvo no Supabase |
| Falha de rede | Mensagem e ação de tentar novamente |
| Conflito de redação | Preservar rascunho local e solicitar decisão |
| Registro inexistente ou não autorizado | Mensagem genérica, sem revelar outro usuário |
| Realtime desconectado | Aviso de sincronização e recuperação do estado oficial |
| Logout ou troca de conta | Remover dados privados da tela e dos caches |
| Rotina/biblioteca | Aviso específico de que permanecem temporárias |

Controles pendentes não podem gerar duplicatas por cliques repetidos.
Mensagens devem ser acessíveis, sem depender apenas de cor.

## 8. Migração e implantação técnica

1. Criar migrações versionadas pelo fluxo oficial do Supabase, revisar SQL
   e registrar os contratos tipados.
2. Preparar tabelas, índices, restrições, privilégios, políticas e comandos
   do cronômetro, sem modificar credenciais ou dados existentes.
3. Aplicar migrações ao projeto externo aprovado; verificar resultados.
4. Implementar o repositório autenticado e os procedimentos tRPC.
5. Conectar as interfaces e Realtime; remover avisos temporários apenas
   dos módulos cuja persistência estiver realmente funcional.
6. Verificar isolamento, erros, concorrência e recuperação.

As migrações não apagarão tabelas ou dados existentes. Alterações destrutivas,
se necessárias por alguma descoberta posterior, exigem nova aprovação.
Publicar a aplicação não faz parte desta autorização.

## 9. Critérios de aceitação

- Cadastro/login continua usando o Supabase Auth existente.
- Prova criada/editada reaparece depois de reload e em outro dispositivo.
- Tópicos e seus estados também são recuperados.
- Redação conserva texto, formatação, partes, cores, ordem e metadados.
- Avaliações e versões reaparecem; restauração recupera personalizações.
- Erro de salvamento não mostra sucesso nem descarta o rascunho.
- Salvamento concorrente não substitui silenciosamente a versão recente.
- Flow em execução continua após reload; Flow pausado permanece pausado.
- Repetir um comando não duplica períodos ou sessões.
- Dois inícios simultâneos resultam em apenas um Flow ativo.
- Duração não inclui pausas e não perde frações a cada transição.
- Encerrar/cancelar registra o período final e o estado correto.
- Mudanças em um dispositivo são recuperadas pelo outro.
- Usuário B não lê, altera, exclui ou referencia registros de A,
  inclusive por chamadas diretas à API.
- Visitante não acessa dados ou executa comandos de estudo.
- Logout/troca de conta não mostra resultados privados do usuário anterior.
- Rotina e biblioteca não são apresentadas como persistidas.

## 10. Verificação e limites da evidência

- Tipagem, build e testes dos contratos e do cálculo temporal.
- Testes de interface em desktop/mobile com sessões controladas, incluindo
  carregamento, criação, edição, exclusão, falha, conflito e recuperação.
- Verificação no banco das políticas, restrições e comandos aplicados,
  com testes isolados e sem alterar registros pessoais reais.
- Testes reais de persistência devem demonstrar escrita e leitura confirmadas
  no projeto externo, não apenas respostas simuladas.
- Entrega real de e-mail e jornadas de confirmação/recuperação de senha
  dependem de uma caixa de testes autorizada e não serão declaradas verificadas
  com base em fixtures.
- Se um teste exigir contas ou dados reais do usuário, obter autorização
  específica em vez de consultar ou modificar silenciosamente seus registros.

## 11. Revisão da especificação

- Os quatro conjuntos pedidos estão cobertos.
- A identidade de credenciais permanece única.
- A rotina e biblioteca temporárias têm limites explícitos.
- O cronômetro tem autoridade de tempo, exclusão de pausas, concorrência,
  recuperação e estratégia de sincronização definidos.
- As personalizações de redação não são reduzidas a snapshots de texto.
- Não há dependência de service-role no caminho normal da aplicação.
- Não há promessa de salvamento offline ou entrega após fechar a aba.
- Publicação, uploads e migração do legado não foram adicionados ao escopo.
