(function(){
'use strict';
const root=document.getElementById('sg-objections');if(!root)return;
const cards=[...root.querySelectorAll('[data-objection]')],search=document.getElementById('obSearch'),category=document.getElementById('obCategory'),status=document.getElementById('obCopyStatus');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
function filter(){const q=normalize(search.value),cat=category.value;let count=0;for(const card of cards){const match=(!cat||card.dataset.objection===cat)&&(!q||normalize(card.textContent).includes(q));card.hidden=!match;if(match)count++;}document.getElementById('obCount').textContent=count+' de '+cards.length+' situações encontradas. Abra uma situação para consultar.';document.getElementById('obEmpty').hidden=count>0;}
window.resetObjections=()=>{search.value='';category.value='';filter();};
search.addEventListener('input',filter);category.addEventListener('change',filter);
function openHash(){const target=document.getElementById(location.hash.slice(1));if(target&&root.contains(target)&&target.tagName==='DETAILS'){window.resetObjections();target.open=true;target.scrollIntoView({block:'start'});}}
window.addEventListener('hashchange',openHash);openHash();
root.querySelectorAll('[data-ob-copy]').forEach(button=>{const label=button.textContent;button.addEventListener('click',async()=>{
 const source=document.getElementById(button.dataset.obCopy);if(!source)return;let text=source.textContent;
 let name='';try{name=typeof prospStorage!=='undefined'?(prospStorage.getItem('prosp_seller_name')||window.prospectUser?.name||''):'';}catch{}
 if(name)text=text.replaceAll('[SEU NOME]',name);
 try{await navigator.clipboard.writeText(text);button.textContent='Copiado · revise antes de enviar';status.textContent=/\[[^\]]+\]/.test(text)?'Texto copiado. Substitua os campos entre colchetes e confira as condições antes de enviar.':'Texto copiado. Adapte à resposta real do cliente; o sistema não enviou mensagem.';clearTimeout(button._copyTimer);button._copyTimer=setTimeout(()=>{button.textContent=label;},3000);}
 catch{status.textContent='Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.';}
});});
filter();
})();