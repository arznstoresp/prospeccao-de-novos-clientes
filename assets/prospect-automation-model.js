(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ProspectAutomation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const closed=new Set(['fechado','nao','invalido']);
  function today(now=new Date()){
    const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const get=t=>parts.find(p=>p.type===t).value;return get('year')+'-'+get('month')+'-'+get('day');
  }
  function phone(value){let n=String(value||'').replace(/\D/g,'');if((n.length===12||n.length===13)&&n.startsWith('55'))n=n.slice(2);return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(n)?n:null;}
  function businessDay(date,days){const d=new Date(date+'T12:00:00Z');while(days>0){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)days--;}return d.toISOString().slice(0,10);}
  function daysSince(date,todayDate){return date?Math.floor((Date.parse(todayDate+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000):999;}
  function queue(results,history,date=today()){
    const seen=new Set(Object.keys(history).map(phone).filter(Boolean));const items=[];let invalid=0;
    for(const [key,h] of Object.entries(history)){
      if(closed.has(h.status))continue;
      if(!phone(key)){invalid++;continue;}
      if(h.followUp&&h.followUp>date)continue;
      const due=h.followUp&&h.followUp<=date;
      if(!due&&h.status!=='novo'&&!(['contatado','interesse'].includes(h.status)&&daysSince(h.atualizadoEm,date)>=4))continue;
      const reason=due?(h.followUp<date?'Retorno atrasado':'Retorno de hoje'):(h.status==='novo'?'Primeiro contato':'Sem próxima data há 4 dias ou mais');
      items.push({key,lead:h,kind:h.status==='novo'?'new':'follow',reason,rank:due?(h.followUp<date?0:1):h.status==='interesse'?2:h.status==='novo'?3:2,date:h.followUp||h.atualizadoEm||date});
    }
    for(const h of results){const n=phone(h.telNum);if(!n){invalid++;continue;}if(seen.has(n))continue;seen.add(n);items.push({key:h.telNum,lead:h,kind:'new',reason:h.corp?'Novo contato corporativo':'Novo contato',rank:3,date});}
    items.sort((a,b)=>a.rank-b.rank||a.date.localeCompare(b.date)||(a.lead.status==='interesse'?0:1)-(b.lead.status==='interesse'?0:1)||Number(!!b.lead.corp)-Number(!!a.lead.corp)||(parseFloat(a.lead.distKm)||Infinity)-(parseFloat(b.lead.distKm)||Infinity)||String(a.lead.nome).localeCompare(String(b.lead.nome),'pt-BR'));
    return {items,invalid};
  }
  function segment(niche){const s=String(niche||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(/automov|concession|revenda|veicul/.test(s))return 'Para o setor automotivo, podemos preparar uniformes da equipe, chaveiros e brindes para a entrega de veículos.';
    if(/clinic|odont|dent|medic|saude|veterin/.test(s))return 'Para a equipe de atendimento, podemos preparar uniformes e jalecos personalizados, além de materiais gráficos para a recepção.';
    if(/restaur|pizz|lanch|padar|cafe|aliment/.test(s))return 'Para o seu atendimento, podemos preparar uniformes da equipe, cardápios e materiais gráficos personalizados.';
    if(/escol|curso|ensino|educa|creche/.test(s))return 'Podemos preparar uniformes, cadernos e kits personalizados para alunos, professores e eventos da instituição.';
    if(/academ|pilates|fitness|esport/.test(s))return 'Podemos preparar uniformes, squeezes e camisetas personalizadas para a equipe e ações com os alunos.';
    if(/contab|advog|escritor|imobil|engenh|arquitet/.test(s))return 'Podemos preparar cadernos, canecas e kits corporativos personalizados para a equipe, clientes e parceiros.';
    return '';
  }
  function followMessage(lead){return 'Olá, equipe '+lead.nome+'!\nTudo bem? Aqui é o Alan, da ArznStoreSP.\n\n'+(lead.status==='interesse'?'Retomando nossa conversa sobre materiais personalizados: vocês já têm uma ideia dos produtos, quantidades e prazo desejado?':'Passando para retomar minha apresentação sobre os materiais personalizados da ArznStoreSP.\n\nVocês têm alguma ação, evento ou reposição de materiais prevista para os próximos meses?');}
  return {today,phone,businessDay,queue,segment,followMessage,closed};
});
