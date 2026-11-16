(function(root){
'use strict';
function read(text,sep){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 const cell=()=>{row.push(field.trim());field='';closed=false;};
 const line=()=>{cell();if(row.some(Boolean))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c===sep){cell();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue;}
  if(closed){if(c===' '||c==='\t')continue;throw Error('CSV com aspas inválidas.');}
  if(c==='"'){if(field.trim())throw Error('CSV com aspas inválidas.');field='';quoted=true;}else field+=c;
 }
 if(quoted)throw Error('CSV com aspas abertas. Exporte o arquivo novamente.');
 line();return rows;
}
const key=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const columns={nome:['title','name','nome','empresa','businessname'],tel:['phone','telefone','phonenumber','formattedphonenumber','internationalphonenumber','whatsapp'],end:['address','endereco','fulladdress'],site:['website','site','urlsite'],rating:['reviewrating','rating','nota','avaliacao','stars'],placeId:['placeid','googleplaceid']};
function prepare(text,existing,niche,phone){
 text=text.replace(/^\uFEFF/,'');
 if(!text.trim())throw Error('O arquivo CSV está vazio.');
 let rows,idx;
 for(const sep of [',',';']){
  try{const candidate=read(text,sep),headers=(candidate[0]||[]).map(key);
   const mapping=Object.fromEntries(Object.entries(columns).map(([k,aliases])=>[k,headers.findIndex(h=>aliases.includes(h))]));
   if(mapping.nome>=0&&mapping.tel>=0){rows=candidate;idx=mapping;break;}
  }catch{}
 }
 if(!rows)throw Error('CSV inválido. Confira as aspas e os cabeçalhos Nome/Title e Telefone/Phone.');
 if(rows.length>251)throw Error('O arquivo tem mais de 250 linhas de dados. Divida em arquivos menores.');
 const seenTel=new Set(existing.map(x=>phone(x.telNum||x.tel)).filter(Boolean));
 const seenId=new Set(existing.map(x=>x.placeId).filter(Boolean));
 const leads=[];let duplicates=0,discarded=0;
 for(const row of rows.slice(1)){
  const get=(k,max)=>((row[idx[k]]||'').slice(0,max));
  const nome=get('nome',160),raw=get('tel',80),telNum=phone(raw),placeId=get('placeId',256);
  if(row.length!==rows[0].length||!nome||!telNum||!/^\+?[\d ().-]+$/.test(raw)||(raw.startsWith('+')&&!raw.replace(/\D/g,'').startsWith('55'))){discarded++;continue;}
  if(seenTel.has(telNum)||(placeId&&seenId.has(placeId))){duplicates++;continue;}
  let site='';try{const u=new URL(get('site',500));if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)site=u.href.slice(0,600);}catch{}
  const stars=Number(get('rating',16).replace(',','.')),rating=stars>0&&stars<=5?stars:0;
  leads.push({nome,tel:telNum,telNum,placeId,site,end:get('end',350),rating,count:0,avaliacao:rating?String(rating).replace('.',','):'Sem nota',nicho:niche,origem:'Scraper',corp:true,pot:'media',distKm:'—'});
  seenTel.add(telNum);if(placeId)seenId.add(placeId);
 }
 return {leads,duplicates,discarded};
}
const api={prepare};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProspectCSV=api;
})(typeof window!=='undefined'?window:globalThis);
