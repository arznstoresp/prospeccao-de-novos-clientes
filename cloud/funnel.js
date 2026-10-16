(function(){
'use strict';
const M=window.ProspectFunnelModel,$=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!M||!$('kanbanBoard'))return;
let scope=null,view='active',stamp='',uid=null;const limits={};
const quoteLabels={requested:'Aguardando gestor',review:'Gestor em análise',needs_info:'Revisar informações',ready:'Proposta aprovada',sent:'Proposta enviada'};
function card(h){
 const tel=h.telNum,ended=M.group(h)==='encerrados',won=M.group(h)==='fechados',mine=h.ownerId===window.prospectUser?.id;
 const label=STATUS_CFG[h.status||'novo']?.label||'Etapa a conferir';
 const due=!ended&&!won&&h.followUp&&h.followUp<new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
 const reason=window.ProspectWorkflowModel?.closeReasons?.[h.status]?.find(([key])=>key===h.closeReason)?.[1]||'';
 return '<article class="sf-card'+(due?' sf-due':'')+'"><h3>'+E(h.nome||'Empresa sem nome')+'</h3><p class="sf-phone">'+E(h.tel||tel)+'</p><div class="sf-tags"><span>'+E(label)+'</span>'+(!ended&&!won&&quoteLabels[h.quoteState]&&quoteLabels[h.quoteState]!==label?'<span class="sf-quote">'+E(quoteLabels[h.quoteState])+'</span>':'')+'</div><p class="sf-owner">'+E(h.ownerName||'Sem responsável')+'</p>'+(!ended&&!won?'<p class="sf-next">'+E(h.nextAction||'Defina a próxima ação na ficha')+(h.followUp?'<small>'+(due?'Vencido · ':'Retorno · ')+E(h.followUp)+(h.nextActionOwner==='manager'?' · Gestor':'')+'</small>':'<small>Sem data definida</small>')+'</p>':reason?'<p class="sf-next">'+E(reason)+'</p>':'')+'<button type="button" class="sf-open" '+(!ended&&!won&&!h.ownerId?'data-sf-claim':'data-sf-open')+'="'+tel+'">'+(!ended&&!won&&!h.ownerId?'Assumir e abrir':mine||window.prospectRole==='admin'?'Abrir atendimento':'Consultar atendimento')+'</button></article>';
}
function render(){
 if(!window.prospectUser)return;
 if(uid!==window.prospectUser.id){uid=window.prospectUser.id;scope=window.prospectRole==='admin'?'all':'work';view='active';stamp='';for(const k of Object.keys(limits))delete limits[k];}
 const board=$('kanbanBoard'),all=M.collect(resultados,HISTORICO),date=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()),leads=M.select(all,{uid,scope,view,date});
 let controls=$('sfControls');if(!controls){controls=document.createElement('div');controls.id='sfControls';controls.className='sf-controls';controls.innerHTML='<div><label for="sfView">Visualização</label><select id="sfView"><option value="active">Funil principal</option><option value="closed">Encerrados · sem interesse ou número errado</option></select></div><div><label for="sfScope">Contatos</label><select id="sfScope"><option value="work">Meus e disponíveis</option><option value="mine">Somente meus</option><option value="free">Sem responsável</option><option value="all">Todos da equipe</option></select></div><p id="sfCount" role="status"></p>';board.before(controls);$('sfView').onchange=()=>{view=$('sfView').value;stamp='';render();};$('sfScope').onchange=()=>{scope=$('sfScope').value;stamp='';render();};}
 $('sfView').value=view;$('sfScope').value=scope;
 const next=JSON.stringify([uid,scope,view,date,leads,limits]);if(next===stamp)return;stamp=next;
 $('sfCount').textContent=leads.length+' contato'+(leads.length===1?'':'s')+' nesta visualização. '+(view==='closed'?'Consulta dos encerramentos; histórico preservado.':'As etiquetas mostram a etapa detalhada. Abra a ficha para trabalhar.');
 board.classList.add('sf-board');board.classList.toggle('sf-closed',view==='closed');
 if(view==='closed'){
  board.innerHTML='<section class="sf-column sf-ended"><header><h2>Encerrados</h2><span>'+leads.length+'</span></header><div class="sf-body">'+(leads.length?leads.slice(0,limits.encerrados||20).map(card).join(''):'<p class="sf-empty">Nenhum encerramento nesta visualização.</p>')+(leads.length>(limits.encerrados||20)?'<button class="sf-more" data-sf-more="encerrados">Mostrar mais '+Math.min(20,leads.length-(limits.encerrados||20))+'</button>':'')+'</div></section>';
 }else{
  board.innerHTML=M.groups.map(g=>{const items=leads.filter(h=>M.group(h)===g.key),limit=limits[g.key]||10;return '<section class="sf-column"><header><h2>'+E(g.label)+'</h2><span>'+items.length+'</span></header><p class="sf-hint">'+E(g.hint)+'</p><div class="sf-body">'+(items.length?items.slice(0,limit).map(card).join(''):'<p class="sf-empty">Nenhum contato nesta etapa.</p>')+(items.length>limit?'<button class="sf-more" data-sf-more="'+g.key+'">Mostrar mais '+Math.min(10,items.length-limit)+'</button>':'')+'</div></section>';}).join('');
 }
 board.querySelectorAll('[data-sf-open]').forEach(b=>b.onclick=()=>window.openLeadWorkflow?.(b.dataset.sfOpen));
 board.querySelectorAll('[data-sf-claim]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await window.cloudSync.claim(b.dataset.sfClaim);render();window.openLeadWorkflow?.(b.dataset.sfClaim);}catch(e){showToast(e.message||'Não foi possível assumir o contato.');}finally{b.disabled=false;}});
 board.querySelectorAll('[data-sf-more]').forEach(b=>b.onclick=()=>{const key=b.dataset.sfMore;limits[key]=(limits[key]||(key==='encerrados'?20:10))+(key==='encerrados'?20:10);stamp='';render();});
}
window.renderSimpleFunnel=render;renderKanban=render;
const previous=window.refreshWorkflow;window.refreshWorkflow=function(){previous?.();if($('tab-funil')?.classList.contains('active'))render();};
})();