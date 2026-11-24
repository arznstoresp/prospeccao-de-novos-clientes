(function(){
'use strict';
const M=window.ProspectAutomation;
if(!M)return;
let pending=null,opened=false;
let draftKey=null,draftText='',adapted=false;
const escape=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panel=document.createElement('section');panel.id='actionWorkspace';panel.className='action-workspace';panel.setAttribute('aria-label','Próxima ação');
document.getElementById('tab-hoje').prepend(panel);
const originalHoje=renderHoje;
renderHoje=function(){originalHoje();renderActions();};
hojeISO=M.today;
waLink=function(telNum,msg){return 'https://wa.me/55'+(M.phone(telNum)||String(telNum||'').replace(/\D/g,''))+'?text='+encodeURIComponent(msg||'');};
telLink=function(telNum){return 'tel:+55'+(M.phone(telNum)||String(telNum||'').replace(/\D/g,''));};
const originalStatus=setStatus,originalQuick=setQuickStatus;
function scheduleForStatus(tel,status){const h=HISTORICO[tel];if(!h)return;if(M.closed.has(status))h.followUp='';else if(status==='interesse'&&!h.followUp)h.followUp=M.businessDay(hojeISO(),1);else if(status==='contatado'&&!h.followUp)h.followUp=M.businessDay(hojeISO(),2);salvarHist();}
setStatus=function(tel,status){originalStatus(tel,status);scheduleForStatus(tel,status);renderAll();};
setQuickStatus=function(tel,status){originalQuick(tel,status);scheduleForStatus(tel,status);renderAll();};
function renderAll(){renderCards();renderHist();renderKanban();renderFollowupBanners();renderHoje();}
function find(tel){return HISTORICO[tel]||resultados.find(r=>r.telNum===tel);}
function getMessage(item){if(item.kind==='follow')return M.followMessage(item.lead);return item.lead.msg||buildMsg(item.lead.nome,item.lead.nicho);}
function currentItem(){if(pending){const lead=find(pending);if(lead&&!M.closed.has(lead.status))return {key:pending,lead,kind:lead.status&&lead.status!=='novo'?'follow':'new',reason:'Conversa preparada'};pending=null;opened=false;}return M.queue(resultados,HISTORICO).items[0];}
function renderActions(){
 const {items,invalid}=M.queue(resultados,HISTORICO);const item=currentItem();
 if(!item){panel.innerHTML='<span class="action-badge">PRÓXIMA AÇÃO</span><h2>Você está em dia</h2><p>Não há retornos vencidos nem novos contatos válidos na fila. Busque empresas para continuar.</p><button class="btn btn-primary" data-action="search">Buscar empresas</button>'+(invalid?'<p class="action-issue">'+invalid+' registro(s) com telefone fora do formato esperado. Confira os dados na fila ou no histórico.</p>':'');return;}
 if(draftKey!==item.key){draftKey=item.key;draftText=getMessage(item);adapted=false;}
 const suggestion=item.kind==='new'?M.segment(item.lead.nicho):'';
 const count=items.length;
 panel.innerHTML='<span class="action-badge">'+escape(item.reason)+' · '+count+' ação(ões) disponível(is)</span><h2>'+escape(item.lead.nome)+'</h2><p>'+escape(item.lead.tel||item.key)+' · '+escape(item.lead.nicho||'Segmento não informado')+'</p>'+
 '<label for="actionMessage">Mensagem pronta para revisar</label><textarea id="actionMessage">'+escape(draftText)+'</textarea>'+
 (suggestion?'<label class="action-check"><input id="actionAdapt" type="checkbox" '+(adapted?'checked':'')+'> Incluir sugestão de produtos para este segmento</label>':'')+
 '<div class="action-buttons"><button class="btn btn-primary" data-action="open">'+(opened?'Abrir WhatsApp novamente':'Abrir WhatsApp')+'</button><button class="btn btn-ghost" data-action="copy">Copiar mensagem</button></div>'+
 (opened?'<p>A conversa foi aberta. Confirme abaixo somente depois de enviar a mensagem.</p><label for="actionReturn">Próximo retorno sugerido</label><input id="actionReturn" type="date" min="'+hojeISO()+'" value="'+M.businessDay(hojeISO(),item.lead.status==='interesse'?1:2)+'"><div class="action-buttons"><button class="btn btn-primary" data-action="confirm">Enviei — confirmar e avançar</button><button class="btn btn-ghost" data-action="cancel">Não enviei</button></div>':'<p>Abrir o WhatsApp não registra envio. Após enviar, confirme aqui para agendar o retorno.</p>')+
 (invalid?'<p class="action-issue">'+invalid+' registro(s) com telefone fora do formato esperado ficaram fora desta fila. Os dados foram preservados.</p>':'')+
 '<details><summary>Como a fila é organizada</summary><p>Retornos atrasados, retornos de hoje, contatos sem próxima data há 4 dias e novos contatos. Nos novos, prioriza empresas corporativas e proximidade; isso não indica intenção de compra.</p><ol class="action-preview-list">'+items.filter(x=>x.key!==item.key).slice(0,3).map(x=>'<li>'+escape(x.lead.nome)+' — '+escape(x.reason)+'</li>').join('')+'</ol></details>';
}
function openConversation(item){
 const number=M.phone(item.key);if(!number){showToast('Confira o telefone e o DDD antes de abrir a conversa.');return;}
 pending=item.key;draftKey=item.key;
 const text=document.getElementById('actionMessage');if(text)draftText=text.value;
 // A abertura exige clique. Nenhum contato ou envio é registrado aqui.
 window.open('https://wa.me/55'+number+'?text='+encodeURIComponent(draftText),'_blank','noopener,noreferrer');opened=true;renderActions();
}
function confirmSent(){
 const item=currentItem();if(!opened||!pending||!item)return;
 const followUp=document.getElementById('actionReturn').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(followUp)||followUp<hojeISO()){showToast('Escolha uma data de retorno a partir de hoje.');return;}
 const text=document.getElementById('actionMessage');if(text)draftText=text.value;
 const fresh=!HISTORICO[item.key]||HISTORICO[item.key].status==='novo';
 if(!HISTORICO[item.key])addToHist(item.lead,'novo');
 const h=HISTORICO[item.key];if(h.status==='novo')h.status='contatado';h.msg=draftText;h.lastSentAt=new Date().toISOString();h.atualizadoEm=hojeISO();h.followUp=followUp;
 salvarHist();removerDaFila(item.key);SELECIONADOS.delete(item.key);if(fresh)incrementarContadorHoje();
 pending=null;opened=false;draftKey=null;renderAll();atualizarBadgeHist();showToast('Envio confirmado. Retorno agendado. Próxima ação pronta.');
}
panel.addEventListener('input',e=>{if(e.target.id==='actionMessage')draftText=e.target.value;});
panel.addEventListener('change',e=>{if(e.target.id!=='actionAdapt')return;const item=currentItem();if(!item)return;const suggestion=M.segment(item.lead.nicho);const text=document.getElementById('actionMessage');
 if(e.target.checked){draftText=text.value.replace(/\n\nConheça nosso catálogo:/,'\n\n'+suggestion+'\n\nConheça nosso catálogo:');if(draftText===text.value)draftText+='\n\n'+suggestion;adapted=true;}else{draftText=text.value.replace('\n\n'+suggestion,'');adapted=false;}text.value=draftText;});
panel.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
 if(action==='search'){switchTab('busca',document.getElementById('tabbtn-busca'));return;}
 if(action==='open'){const item=currentItem();if(item)openConversation(item);}
 if(action==='confirm')confirmSent();
 if(action==='cancel'){pending=null;opened=false;draftKey=null;renderActions();}
 if(action==='copy'){const text=document.getElementById('actionMessage').value;navigator.clipboard.writeText(text).then(()=>showToast('Mensagem copiada.')).catch(()=>showToast('Selecione a mensagem e copie pelo teclado.'));}
});
// Intercepta os links existentes antes do antigo registro automático de contato.
document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(!link||!link.href.startsWith('https://wa.me/55'))return;e.preventDefault();e.stopImmediatePropagation();const number=M.phone(new URL(link.href).pathname.slice(1));if(!number){showToast('Confira o telefone e o DDD antes de abrir a conversa.');return;}
 const key=Object.keys(HISTORICO).find(k=>M.phone(k)===number)||resultados.find(r=>M.phone(r.telNum)===number)?.telNum;
 if(!key)return;e.preventDefault();e.stopImmediatePropagation();const lead=find(key);if(M.closed.has(lead.status)){showToast('Contato encerrado. Altere o status antes de retomar.');return;}
 pending=key;draftKey=key;draftText=getMessage({lead,kind:lead.status&&lead.status!=='novo'?'follow':'new'});adapted=false;
 switchTab('hoje',document.getElementById('tabbtn-hoje'));openConversation(currentItem());
},true);
renderMetaBar();
renderAll();
})();
