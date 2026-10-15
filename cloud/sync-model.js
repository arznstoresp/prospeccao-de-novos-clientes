/* Pure projection and field-diff logic shared by browser and regression tests. */
(function(root){
 const SHARED=['prosp_enderecos','prosp_ativo','prosp_assin','prosp_msgs','prosp_alan_wa','prosp_proxy'];
 const PERSONAL=['prosp_func_nome','prosp_meta','prosp_contador','prosp_checklist','prosp_checklist_date','prosp_msgRotIdx'];
 const parse=(v,f)=>{try{return JSON.parse(v)||f}catch{return f}};
 const phone=v=>{let n=String(v||'').replace(/\D/g,'');if((n.length===12||n.length===13)&&n.startsWith('55'))n=n.slice(2);return /^\d{10,11}$/.test(n)?n:''};
 const clean=o=>Object.fromEntries(Object.entries(o||{}).filter(([k])=>!['__proto__','prototype','constructor'].includes(k)));
 function project(storage,uid){
  const docs={};const queue=parse(storage.getItem('prosp_fila'),[]),hist=parse(storage.getItem('prosp_historico'),{});
  for(const item of Array.isArray(queue)?queue:[]){const n=phone(item.telNum||item.tel);if(n)docs['lead:'+n]={...clean(item),telNum:n,bucket:'queue'};}
  for(const [key,item] of Object.entries(hist)){if(!item||typeof item!=='object')continue;const n=phone(item.telNum||key||item.tel);if(n)docs['lead:'+n]={...clean(item),telNum:n,bucket:'history'};}
  for(const k of SHARED){const v=storage.getItem(k);if(v!==null)docs['cfg:'+k]={value:v};}
  for(const k of PERSONAL){const v=storage.getItem(k);if(v!==null)docs['usr:'+uid+':'+k]={value:v};}
  return docs;
 }
 function diff(before,after){
  const changes=[];
  for(const [key,doc]of Object.entries(after)){
   const old=before[key]||{},patch={};
   for(const [k,v]of Object.entries(doc)){if(JSON.stringify(old[k])!==JSON.stringify(v))patch[k]=v;}
   if(Object.keys(patch).length)changes.push({key,patch});
  }
  for(const key of Object.keys(before)){if(!(key in after))changes.push({key,patch:{},deleted:true});}
  return changes;
 }
 function overlay(rows,batches){
  const records=new Map(rows.map(r=>[r.key,{...r,doc:clean(r.doc)}]));
  for(const batch of batches)for(const c of batch.changes){const old=records.get(c.key);if(old?.deleted)continue;const doc={...(old?.doc||{}),...clean(c.patch)};if(old?.doc.bucket==='history')doc.bucket='history';records.set(c.key,{key:c.key,doc,deleted:!!c.deleted});}
  return [...records.values()];
 }
 function materialize(rows,uid){
  const values={},queue=[],hist={};
  for(const row of rows){if(row.deleted)continue;const d=clean(row.doc);
   if(row.key.startsWith('lead:')){const n=phone(row.key.slice(5));if(!n)continue;d.telNum=n;d.maps=/^https:\/\/www\.google\.com\/maps\//.test(d.maps||'')?d.maps:'';if(d.bucket==='history')hist[n]={...d};else queue.push({...d});}
   else if(row.key.startsWith('cfg:'))values[row.key.slice(4)]=d.value;
   else if(row.key.startsWith('usr:'+uid+':'))values[row.key.slice(('usr:'+uid+':').length)]=d.value;
  }
  values.prosp_fila=JSON.stringify(queue.filter(r=>!hist[r.telNum]));values.prosp_historico=JSON.stringify(hist);return values;
 }
 const api={SHARED,PERSONAL,project,diff,overlay,materialize,phone,parse};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProspectModel=api;
})(typeof window!=='undefined'?window:globalThis);
