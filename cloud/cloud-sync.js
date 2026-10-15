(function(){
 'use strict';
 const M=window.ProspectModel,$=id=>document.getElementById(id);
 const app=$('prospApp'),gate=$('cloudGate'),status=$('cloudStatus'),message=$('cloudAuthMessage');
 if(!window.supabase||!M){message.textContent='Não foi possível carregar a conexão. Atualize a página para tentar novamente.';return;}
 const client=window.supabase.createClient('https://edztcoebgllqrkrkormc.supabase.co','sb_publishable_s6MSdF0rhidpCpddqTzNRg_1ajwnxIc',{auth:{storageKey:'arzn-prospect-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 let user=null,member=null,shadow={},rows=[],busy=false,ready=false,activating=false,timer=null,stopped=false;
 const tabId=sessionStorage.getItem('arzn-prosp-tab')||crypto.randomUUID();sessionStorage.setItem('arzn-prosp-tab',tabId);
 const outPrefix=uid=>'arzn-prosp-outbox:'+uid+':';
 const ownKey=()=>outPrefix(user.id)+tabId;
 const pending=()=>{const batches=[];if(!user)return batches;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(outPrefix(user.id))){const a=M.parse(localStorage.getItem(key),[]);if(Array.isArray(a))a.forEach(b=>b?.id&&Array.isArray(b.changes)&&batches.push({...b,storageKey:key}));}}return batches;};
 function setStatus(text,error=false){status.textContent=text;status.style.color=error?'#ffb36b':'#b6eacb';}
 function appendBatch(changes){
  if(member?.role!=='admin')changes=changes.filter(c=>!c.key.startsWith('cfg:'));
  if(!changes.length||!user)return;
  const key=ownKey(),queue=M.parse(localStorage.getItem(key),[]);queue.push({id:crypto.randomUUID(),changes});
  localStorage.setItem(key,JSON.stringify(queue));setStatus('Alterações salvas neste aparelho · sincronizando…');
 }
 function changed(){
  if(!ready||!user)return;
  const current=M.project(prospStorage,user.id),changes=M.diff(shadow,current);shadow=current;
  try{appendBatch(changes);}catch{setStatus('Armazenamento cheio. Exporte um backup antes de sair.',true);}
  clearTimeout(timer);timer=setTimeout(sync,450);
 }
 window.cloudSync={changed,
 async activity(tel){
  if(!ready||!user)throw new Error('Entre na sua conta.');
  const {data,error}=await client.from('prospect_audit').select('id,record_key,actor,actor_name,created_at,before_doc,after_doc,is_deleted').eq('record_key','lead:'+tel).order('created_at',{ascending:false}).limit(100);
  if(error)throw new Error('Não foi possível carregar as atividades.');return data||[];
 },
 async periodActivity(start,end){
  if(!ready||!user)throw new Error('Entre na sua conta.');
  const data=[];for(let from=0;from<10000;from+=1000){
   const result=await client.from('prospect_audit').select('id,record_key,actor,actor_name,created_at,before_doc,after_doc,is_deleted').like('record_key','lead:%').gte('created_at',start+'T00:00:00-03:00').lt('created_at',end+'T00:00:00-03:00').order('created_at',{ascending:false}).range(from,from+999);
   if(result.error)throw new Error('Não foi possível carregar os indicadores.');data.push(...result.data);if(result.data.length<1000)return {rows:data,truncated:false};
  }return {rows:data,truncated:true};
 },
 async claim(tel){
 if(!ready||!user||!navigator.onLine)throw new Error('Conecte à internet para reservar o contato.');
 await sync();if(pending().length)throw new Error('Aguarde a sincronização antes de reservar.');
 const lead=HISTORICO[tel]||resultados.find(r=>r.telNum===tel);
 if(!lead)throw new Error('Contato não encontrado.');
 if(lead.ownerId&&lead.ownerId!==user.id&&member.role!=='admin')throw new Error('Esse contato já tem responsável.');
 const {error}=await client.rpc('prospect_apply',{changes:[{key:'lead:'+tel,patch:{ownerId:user.id,ownerName:member.name||user.email}}],batch_id:crypto.randomUUID()});
 if(error)throw new Error('Não foi possível reservar. Outro atendimento pode ter assumido; sincronize.');
 await sync();
 }};
 function applyRole(){
  window.prospectRole=member?.role||null;
  window.prospectUser=user?{id:user.id,name:member?.name||user.email,role:member?.role}:null;
  const admin=member?.role==='admin';
  $('tabbtn-config').hidden=!admin;
  $('tab-config').hidden=!admin;
  $('teamPanel').hidden=!admin;$('migrationPanel').hidden=!admin;
  if(!admin&&$('tab-config').classList.contains('active'))switchTab('hoje',$('tabbtn-hoje'));
 }
 $('cloudMyAccount').onclick=()=>{const panel=$('cloudAccountPanel');panel.hidden=!panel.hidden;$('cloudMyAccount').setAttribute('aria-expanded',String(!panel.hidden));};

 async function allRows(){
  const list=[];for(let from=0;;from+=1000){const {data,error}=await client.from('prospect_records').select('key,doc,deleted,revision').order('key').range(from,from+999);if(error)throw error;list.push(...data);if(data.length<1000)break;}return list;
 }
 function refreshApp(){
  HISTORICO=M.parse(prospStorage.getItem('prosp_historico'),{});
  resultados=M.parse(prospStorage.getItem('prosp_fila'),[]).filter(r=>!HISTORICO[r.telNum]);
  ENDERECOS=M.parse(prospStorage.getItem('prosp_enderecos'),[]);if(!Array.isArray(ENDERECOS))ENDERECOS=[];
  ATIVO_IDX=parseInt(prospStorage.getItem('prosp_ativo')||'0');if(!ENDERECOS[ATIVO_IDX])ATIVO_IDX=ENDERECOS.length?0:-1;
  USER_LAT=ENDERECOS[ATIVO_IDX]?.lat??null;USER_LNG=ENDERECOS[ATIVO_IDX]?.lng??null;
  const editing=document.activeElement?.matches('input,textarea,select');
  if(editing)return;
  const fields={assinatura:'prosp_assin',funcNomeInput:'prosp_func_nome',alanWaInput:'prosp_alan_wa',proxyUrlInput:'prosp_proxy'};
  for(const [id,key]of Object.entries(fields)){const v=prospStorage.getItem(key);if(v!==null&&$(id))$(id).value=v;}
  const variants=M.parse(prospStorage.getItem('prosp_msgs'),[]);[1,2,3].forEach((n)=>{if($('msgVar'+n))$('msgVar'+n).value=variants[n-1]||''});
  atualizarLocAtiva();renderChips();atualizarBadgeHist();renderMetaBar();renderFollowupBanners();renderCards();renderHist();renderKanban();renderHoje();
  if($('tab-guia')?.classList.contains('active'))renderChecklist();
  window.refreshOperations?.();window.refreshWorkflow?.();
 }
 function applyRows(next){
  const previous=JSON.stringify(shadow);
  rows=next;
  window.prospectTrainingRows=member?.role==='admin'?next.filter(r=>r.key.startsWith('usr:')&&!r.deleted):[];
  const data=M.materialize(M.overlay(rows,pending()),user.id);
  if(!data.prosp_func_nome)data.prosp_func_nome=member.name||'';
  prospStorage.load(user.id,data);shadow=M.project(prospStorage,user.id);if(previous!==JSON.stringify(shadow))refreshApp();else window.refreshOperations?.();
 }
 async function sync(){
  if(!user||!ready||busy||stopped)return;
  if(!navigator.onLine){setStatus('Sem internet · alterações guardadas neste aparelho',true);return;}
  if($('buscarBtn')?.disabled){setStatus('Busca em andamento · sincronização em seguida');return;}
  busy=true;const uid=user.id;
  try{
   const {data:access,error:accessError}=await client.from('prospect_members').select('email,name,role,active').eq('email',user.email.toLowerCase()).maybeSingle();
   if(accessError)throw accessError;
   if(!access?.active){lock('Seu acesso foi desativado. Procure o gestor.');return;}
   member=access;applyRole();
   for(const batch of pending()){
    if(!user||user.id!==uid)return;
    const {error}=await client.rpc('prospect_apply',{changes:member.role==='admin'?batch.changes:batch.changes.filter(c=>!c.key.startsWith('cfg:')),batch_id:batch.id});if(error)throw error;
    const remaining=M.parse(localStorage.getItem(batch.storageKey),[]).filter(b=>b.id!==batch.id);
    if(remaining.length)localStorage.setItem(batch.storageKey,JSON.stringify(remaining));else localStorage.removeItem(batch.storageKey);
   }
   const remote=await allRows();if(user?.id!==uid)return;
   applyRows(remote);setStatus(pending().length?'Novas alterações aguardando envio':'Sincronizado · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
  }catch(error){setStatus('Sincronização pendente · dados guardados neste aparelho. '+(error.message||'Confira sua conexão.'),true);}
  finally{busy=false;}
 }
 function lock(reason){
  window.closeWorkflow?.();
  ready=false;stopped=true;app.hidden=true;gate.hidden=false;message.textContent=reason||'';
  prospStorage.clear();HISTORICO={};resultados=[];ENDERECOS=[];USER_LAT=null;USER_LNG=null;user=null;member=null;window.prospectRole=null;window.prospectUser=null;window.prospectTrainingRows=[];$('cloudAccountPanel').hidden=true;
 }
 async function activate(session){
  if(activating)return;if(!session?.user){lock('Entre com sua conta para acessar os dados da equipe.');return;}
  if(ready&&user?.id===session.user.id)return;
  activating=true;message.textContent='Conferindo acesso e carregando os dados…';
  try{
   const {data:{user:verified},error:verifyError}=await client.auth.getUser();if(verifyError||!verified)throw new Error('Sessão inválida. Entre novamente.');
   const {data:access,error}=await client.from('prospect_members').select('email,name,role,active').eq('email',verified.email.toLowerCase()).maybeSingle();
   if(error)throw error;if(!access?.active)throw new Error('Esta conta não está liberada para a prospecção. Peça ao Alan para liberar seu acesso.');
   user=verified;member=access;applyRole();stopped=false;
   const remote=await allRows();
   // Recover unsent browser changes before replacing the local projection.
   const cached=prospStorage.cached(user.id);
   if(pending().length)prospStorage.load(user.id,cached);
   applyRows(remote);ready=true;gate.hidden=true;app.hidden=false;
   $('cloudUser').textContent=(access.name||verified.email)+' · '+(access.role==='admin'?'Gestor':'Equipe');
   $('teamPanel').hidden=access.role!=='admin';$('migrationPanel').hidden=access.role!=='admin';
   const legacy=prospStorage.original(),legacyDocs=M.project({getItem:k=>legacy[k]??null},user.id);
   $('migrationSummary').textContent=Object.keys(legacyDocs).filter(k=>k.startsWith('lead:')).length+' contatos encontrados neste navegador. A importação mescla os dados e mantém os registros da nuvem.';
   $('cloudAuthForm').reset();setStatus('Conectado · sincronizando');if(access.role==='admin')loadTeam();await sync();
   if(!user||!ready)return;
   const migrationKey='arzn-prosp-migrated:'+user.id;
   if(access.role==='admin'&&!localStorage.getItem(migrationKey)&&Object.keys(legacyDocs).length){
    try{const n=await mergeLegacy(legacy);localStorage.setItem(migrationKey,'1');$('migrationMessage').textContent=n+' contatos novos mesclados automaticamente. Os dados originais continuam preservados.';}
    catch{$('migrationMessage').textContent='Não foi possível concluir a migração automática. Seus dados originais estão preservados. Use o botão abaixo para tentar novamente.';}
   }
  }catch(error){lock(error.message||'Não foi possível acessar. Confira a conexão e tente novamente.');}
  finally{activating=false;}
 }
 $('cloudAuthForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('cloudLoginBtn');btn.disabled=true;message.textContent='Entrando…';
  try{const {data,error}=await client.auth.signInWithPassword({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value});if(error)throw error;await activate(data.session);}
  catch{message.textContent='Não foi possível entrar. Confira e-mail, senha e conexão. Use a senha da sua conta já existente na Central de Vendas, se houver.';}
  finally{btn.disabled=false;}
 });
 $('cloudLogout').addEventListener('click',async()=>{
  await sync();if(pending().length){setStatus('Ainda há alterações pendentes. Conecte à internet e sincronize antes de sair.',true);return;}
  await client.auth.signOut({scope:'local'});lock('Você saiu. Os dados já enviados permanecem na nuvem.');
 });
 $('cloudRetry').addEventListener('click',sync);
 $('cloudReloadAuth').addEventListener('click',async()=>{const {data}=await client.auth.getSession();await activate(data.session)});
 $('cloudAccountSwitch').addEventListener('click',async()=>{await client.auth.signOut({scope:'local'});lock('Entre com a conta liberada para você.')});
 async function loadTeam(){
  const list=$('teamList');list.replaceChildren();
  const {data,error}=await client.from('prospect_members').select('email,name,role,active').order('created_at');
  if(error){list.textContent='Não foi possível carregar a equipe.';return;}
  for(const person of data){const row=document.createElement('div');row.className='cloud-team-row';const text=document.createElement('span');text.textContent=person.name+' · '+person.email+' · '+(person.active?'Ativo':'Desativado');row.append(text);
   if(person.role!=='admin'){const b=document.createElement('button');b.className='btn btn-ghost btn-sm';b.textContent=person.active?'Desativar':'Reativar';b.onclick=async()=>{b.disabled=true;try{const {error}=await client.functions.invoke('prospect-team-admin',{body:{action:'toggle',email:person.email,active:!person.active}});if(error)throw error;await loadTeam();}catch{$('teamMessage').textContent='Não foi possível alterar o acesso.';b.disabled=false;}};row.append(b);}list.append(row);
  }
 }
 $('teamForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('teamCreateBtn');btn.disabled=true;$('teamMessage').textContent='Criando acesso…';
  try{const {data,error}=await client.functions.invoke('prospect-team-admin',{body:{action:'create',email:$('teamEmail').value.trim(),name:$('teamName').value.trim(),password:$('teamPassword').value}});if(error||data?.error)throw new Error(data?.error||'Não foi possível criar o acesso. Confira os dados.');$('teamMessage').textContent=data.message||'Acesso liberado.';$('teamForm').reset();await loadTeam();}
  catch(error){$('teamMessage').textContent=error.message;}finally{btn.disabled=false;}
 });
 // Merge only missing records/fields. Existing cloud decisions and notes win.
 async function mergeLegacy(source){
  if(!user||!ready)throw new Error('Entre na conta antes de importar.');
  await sync();const original=JSON.stringify(source);const backupKey='arzn-prosp-original-backup:'+Date.now();localStorage.setItem(backupKey,original);
  const incoming=M.project({getItem:k=>source[k]??null},user.id),current=M.project(prospStorage,user.id),changes=[];let added=0;
  for(const [key,doc]of Object.entries(incoming)){
   const old=current[key],patch={};
   for(const [k,v]of Object.entries(doc))if(!old||old[k]===undefined||old[k]===null||old[k]==='')patch[k]=v;
   if(old?.bucket==='queue'&&doc.bucket==='history'){patch.bucket='history';for(const k of ['status','notas','followUp','data','atualizadoEm'])if(doc[k])patch[k]=doc[k];}
   if(Object.keys(patch).length){changes.push({key,patch});if(key.startsWith('lead:')&&!old)added++;}
  }
  for(let i=0;i<changes.length;i+=200)appendBatch(changes.slice(i,i+200));
  applyRows(rows);await sync();return added;
 }
 $('migrateLocalBtn').addEventListener('click',async()=>{
  const btn=$('migrateLocalBtn');btn.disabled=true;
  try{const n=await mergeLegacy(prospStorage.original());$('migrationMessage').textContent=n+' contatos novos mesclados. '+(pending().length?'Aguardando conexão para terminar o envio.':'Dados sincronizados. Os originais permanecem preservados neste navegador.');}
  catch(error){$('migrationMessage').textContent=error.message;}finally{btn.disabled=false;}
 });
 window.importarBackup=function(){
  if(!ready){showToast('Entre na sua conta.');return;}
  const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>10000000)throw new Error('Arquivo muito grande (máximo 10 MB).');const source=JSON.parse(await file.text());if(!source.v&&!source.prosp_fila&&!source.prosp_historico)throw new Error('Backup inválido.');const n=await mergeLegacy(source);showToast(n+' novos contatos mesclados. Confira a sincronização no topo.');}catch(error){showToast(error.message||'Não foi possível importar o backup.');}};input.click();
 };
 $('myPasswordForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('myPasswordBtn'),msg=$('myPasswordMessage');
  if($('myNewPassword').value!==$('myConfirmPassword').value){msg.textContent='As novas senhas não coincidem.';return;}
  btn.disabled=true;msg.textContent='Atualizando sua senha…';
  try{const {error}=await client.auth.updateUser({password:$('myNewPassword').value,currentPassword:$('myCurrentPassword').value});if(error)throw error;msg.textContent='Senha atualizada. Use a nova senha nos próximos acessos.';$('myPasswordForm').reset();}
  catch{msg.textContent='Não foi possível alterar a senha. Confira a senha atual e use pelo menos 12 caracteres.';}finally{btn.disabled=false;}
 });
 $('cloudShare').addEventListener('click',async()=>{const link='https://arznstoresp.github.io/prospeccao-de-novos-clientes/';try{await navigator.clipboard.writeText(link);showToast('Link copiado. Envie pelo WhatsApp da funcionária.');}catch{showToast('Copie o endereço desta página e envie à funcionária.')}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});window.addEventListener('online',sync);window.addEventListener('offline',()=>setStatus('Sem internet · alterações guardadas neste aparelho',true));
 window.addEventListener('beforeunload',e=>{if(pending().length){e.preventDefault();e.returnValue='Há alterações aguardando sincronização.'}});
 setInterval(()=>{if(!document.hidden)sync()},10000);
 client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')lock('Entre para continuar.');else if(event==='SIGNED_IN'||event==='INITIAL_SESSION')setTimeout(()=>activate(session),0)});
 client.auth.getSession().then(({data})=>activate(data.session)).catch(()=>lock('Não foi possível abrir a sessão. Tente novamente.'));
})();
