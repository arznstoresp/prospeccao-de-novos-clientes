# Prospecção ArznStoreSP — acesso compartilhado

Aplicação estática no GitHub Pages, com autenticação Supabase e tabelas exclusivas `prospect_*` no projeto da empresa. Não depende do número do WhatsApp.

## Uso

1. Gestor entra com sua conta existente da Central de Vendas.
2. No primeiro login do gestor no navegador original, a migração mescla automaticamente os dados locais. Config. → Mesclar dados deste navegador com a nuvem permite repetir. Os dados antigos permanecem intactos. Backups JSON também podem ser importados por mesclagem.
3. Config. → Acessos da equipe: nome, e-mail e senha inicial com 12 caracteres ou mais. Nenhum e-mail é enviado automaticamente. O gestor compartilha o link e a senha inicial diretamente.
4. Funcionária entra com a mesma conta no notebook e no celular; pode trocar a senha em Minha conta. No notebook conecta o WhatsApp Web ao celular de prospecção.
5. Observe `Sincronizado` antes de fechar. A atualização entre aparelhos ocorre ao voltar à página ou a cada 10 segundos com a aba visível.

## Dados e recuperação

- Um registro por contato, normalizado pelo telefone, com fila e histórico na mesma identidade.
- Alterações enviam apenas os campos modificados. Alterações simultâneas no mesmo campo seguem a última gravação; as versões anteriores ficam em `prospect_audit`.
- Remoções são tombstones; as versões anteriores permanecem no banco. Não há remoção física pelo frontend.
- Lotes têm UUID e repetição idempotente. Uma fila local por sessão de navegador guarda operações não enviadas; a nova conexão tenta novamente. Não limpe os dados do navegador enquanto houver pendências.
- Ao importar, registros/campos já preenchidos na nuvem são preservados; um histórico importado pode promover um contato ainda na fila. Não restaura tombstones automaticamente.
- Os registros antigos `prosp_*` ficam intactos para nova importação e recuperação. Caches da nuvem usam namespace por usuário. Senhas e chave Google não entram na sincronização.
- O backup exportado pelo aplicativo contém os dados comerciais visíveis e preferências, nunca tokens de login. Deve ser guardado em local privado.

## Segurança

RLS em todas as tabelas novas. Pessoas sem associação ativa não leem registros. O gestor gerencia acessos pela Edge Function `prospect-team-admin`, que valida JWT, confirmação de e-mail e perfil admin no servidor. Apenas a chave publicável aparece no site; a chave administrativa só é obtida do ambiente da função. O serviço de autenticação existente é reutilizado sem redefinir senhas de contas já existentes. A função cria uma associação staff para usuários existentes sem alterar suas credenciais.

A administração da equipe e a mudança de senha exigem internet. Não existe cadastro público nem liberação por `user_metadata`.

## Código

- `cloud/cloud-storage.js`: separa os dados antigos e o cache por conta.
- `cloud/sync-model.js`: projeção e diferenças por campo.
- `cloud/cloud-sync.js`: sessão, acesso, outbox, migração e interface da equipe.
- `cloud/supabase-2.102.0.js`: distribuição UMD fixada de @supabase/supabase-js 2.102.0, licença MIT no arquivo adjacente.
- `database/prospect-schema.sql`: esquema aplicado via migração remota `prospect_shared_team_sync`.
- `functions/prospect-team-admin.ts`: fonte da Edge Function implantada.

Testes: `node tests/sync-model.test.cjs` e `node tests/cloud-sync.test.cjs`. Os testes carregam os módulos em `../cloud/` quando estão no repositório.
