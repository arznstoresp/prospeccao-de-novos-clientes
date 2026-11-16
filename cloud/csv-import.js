(function(){
'use strict';
const el=id=>document.getElementById(id),form=el('csvImportForm'),status=el('csvImportStatus'),button=el('csvImportSubmit');
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(button.disabled)return;
 const file=el('csvImportFile').files[0],niche=el('csvImportNiche').value.trim(),userId=window.prospectUser?.id;
 if(!userId||el('prospApp').hidden){status.textContent='Entre na sua conta para importar.';return;}
 if(!file||!niche){status.textContent='Selecione o CSV e informe o nicho.';return;}
 if(file.size>1024*1024){status.textContent='Use um CSV de até 1 MB e 250 linhas de dados.';return;}
 button.disabled=true;status.textContent='Lendo arquivo…';
 try{
  const csv=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
  if(window.prospectUser?.id!==userId||el('prospApp').hidden)return;
  const {leads,duplicates,discarded}=window.ProspectCSV.prepare(csv,[...resultados,...Object.values(HISTORICO)],niche,telefoneParaNovoLead);
  if(leads.length){
   resultados=[...leads.map(lead=>({...lead,msg:buildMsg(lead.nome,niche,lead.rating,0)})),...resultados];
   salvarFila();renderCards();renderHoje();renderKanban();window.refreshOperations?.();
   el('csvImportFile').value='';
  }
  status.textContent=leads.length+' na fila · '+duplicates+' duplicados · '+discarded+' descartados (nome, telefone ou linha inválida).'+(leads.length?' Confira o indicador de sincronização no topo.':'');
 }catch(error){status.textContent=error instanceof TypeError?'Não foi possível ler o arquivo. Confira se ele está em UTF-8.':(error.message||'Falha ao importar o CSV.');}
 finally{button.disabled=false;}
});
})();
