undefined

## Operação assistida da vendedora
- Em Hoje, Preparação para começar mostra nome/número, estado de sincronização e confirmações autodeclaradas de WhatsApp, dois aparelhos e treino. Preferência individual sincronizada, sem inferir treinamento concluído.
- Começar meu dia filtra retornos vencidos, de hoje e contatos sem próxima data. Demandas com ação do gestor e atendimentos encerrados ficam fora dessa fila. Tarefas futuras permanecem em Meus contatos.
- treinamento.html é uma simulação de dez etapas, com caso sintético e aprovação fictícia. Não usa Supabase nem abre WhatsApp; salva somente na sessão da aba e não altera indicadores.
- Resumo do contato e apoio de famílias de produtos no atendimento. Copiar ficha para cotação inclui qualificação e próxima ação; exclui notas internas.
- Gestor pode vincular catálogo/proposta aprovado por HTTPS no orçamento. Não há importação automática de preços ou estoque.
- Novos encerramentos na interface exigem motivo compatível com Sem interesse ou Número errado; Outro exige detalhe. Registros legados são preservados. closeReason e closeDetail são protegidos pelo guard de responsabilidade no banco.
- Motivos por segmento são uma fotografia da carteira atual, não taxa de conversão nem filtro por período.
- Testes: node --test tests/*.test.cjs. QA isolado: tests/workflow-preview.html e tests/training-mobile.html. Para operação real, validar primeiro número conectado, sincronização entre aparelhos e primeira abordagem acompanhada.


## Próxima ação e confirmação de envio

A aba Hoje reúne retornos vencidos, retornos do dia, contatos sem próxima data há quatro dias e novos contatos. Nas novas empresas, a fila considera o perfil corporativo e a proximidade; avaliações do Google não são tratadas como intenção de compra. Telefones malformados e duplicidades ficam fora dessa fila, sem apagar os registros.

Abrir o WhatsApp prepara a conversa, sem marcar envio. Depois do envio, o botão **Enviei — confirmar e avançar** registra o contato e agenda um retorno sugerido para dois dias de semana depois (um para interessados). A data pode ser alterada antes da confirmação; feriados não são calculados. Contatos encerrados ficam fora da fila. O texto aprovado permanece no primeiro contato, com uma opção para acrescentar sugestões conforme o segmento. Retornos usam um texto próprio de acompanhamento.

A persistência utiliza o armazenamento já existente do navegador. Este recurso não dispara mensagens sozinho nem comprova a existência de WhatsApp no número. Testes das regras: `node --test tests/prospect-automation.test.cjs`.
