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
