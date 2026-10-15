const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const memory=()=>{const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
function device(server,uid='owner'){
 const nodes=new Map();const node=()=>({hidden:false,style:{},value:'',textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f},reset(){},replaceChildren(){},append(){},classList:{contains(){return false}}});
 const el=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 const authUser={id:uid,email:uid+'@example.test'};
 const sdk={auth:{getUser:async()=>({data:{user:authUser}}),getSession:async()=>({data:{session:{user:authUser}}}),onAuthStateChange(){},signOut:async()=>({})},
 from(table){let range=[0,999];return {select(){return this},eq(){return this},order(){return this},range(a,b){range=[a,b];return Promise.resolve({data:[...server.records.values()].slice(a,b+1)})},maybeSingle:async()=>({data:{email:authUser.email,name:uid,role:'admin',active:!server.revoked}}),then(resolve){return Promise.resolve({data:[]}).then(resolve)}}},
 rpc:async(name,{changes,batch_id})=>{if(server.offline)throw new Error('offline');if(!server.seen.has(batch_id)){server.seen.add(batch_id);for(const c of changes){const old=server.records.get(c.key);if(old?.deleted)continue;const doc={...(old?.doc||{}),...c.patch};if(old?.doc.bucket==='history')doc.bucket='history';server.records.set(c.key,{key:c.key,doc,deleted:!!c.deleted})}}return {}},functions:{invoke:async()=>({data:{ok:true}})}};
 const local=memory(),session=memory();local.setItem('prosp_fila',JSON.stringify([{nome:'Legacy',telNum:'11912345678'}]));
 const context={console,Map,JSON,Date,Promise,setTimeout,clearTimeout,setInterval(){},crypto:{randomUUID},navigator:{onLine:true},localStorage:local,sessionStorage:session,
 document:{getElementById:el,createElement:node,addEventListener(){},hidden:false,activeElement:null},supabase:{createClient:()=>sdk},addEventListener(){},
 HISTORICO:{},resultados:[],ENDERECOS:[],ATIVO_IDX:-1,USER_LAT:null,USER_LNG:null};
 for(const f of ['atualizarLocAtiva','renderChips','atualizarBadgeHist','renderMetaBar','renderFollowupBanners','renderCards','renderHist','renderKanban','renderHoje','renderChecklist','showToast'])context[f]=()=>{};
 context.window=context;vm.createContext(context);
 for(const file of ['sync-model.js','cloud-storage.js','cloud-sync.js'])vm.runInContext(fs.readFileSync((fs.existsSync(__dirname+'/../cloud/'+file)?__dirname+'/../cloud/':__dirname+'/')+file,'utf8'),context);
 return {context,local,el,sync:async()=>{await el('cloudRetry').listeners.click()}};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server={records:new Map(),seen:new Set()};const a=device(server),b=device(server);await wait(30);
 assert.equal(a.el('prospApp').hidden,false);assert.equal(a.context.resultados.length,1);assert(a.local.getItem('prosp_fila').includes('Legacy'));
 a.context.prospStorage.setItem('prosp_fila',JSON.stringify([{nome:'Novo',telNum:'11999999999',pot:'alta'}]));await a.sync();
 await b.sync();assert.equal(b.context.resultados[0].nome,'Novo');
 a.context.prospStorage.setItem('prosp_historico',JSON.stringify({'11999999999':{nome:'Novo',telNum:'11999999999',bucket:'history',status:'contatado',notas:'A'}}));a.context.prospStorage.setItem('prosp_fila','[]');await a.sync();await b.sync();
 b.context.prospStorage.setItem('prosp_historico',JSON.stringify({'11999999999':{...b.context.HISTORICO['11999999999'],status:'interesse'}}));await b.sync();
 a.context.prospStorage.setItem('prosp_historico',JSON.stringify({'11999999999':{...a.context.HISTORICO['11999999999'],notas:'B'}}));await a.sync();
 assert.equal(server.records.get('lead:11999999999').doc.status,'interesse');assert.equal(server.records.get('lead:11999999999').doc.notas,'B');
 server.offline=true;a.context.prospStorage.setItem('prosp_historico',JSON.stringify({'11999999999':{...a.context.HISTORICO['11999999999'],followUp:'2026-10-16'}}));await a.sync();
 assert([...Array(a.local.length)].map((_,i)=>a.local.key(i)).some(k=>k.startsWith('arzn-prosp-outbox:')));
 server.offline=false;await a.sync();assert.equal(server.records.get('lead:11999999999').doc.followUp,'2026-10-16');
 server.revoked=true;await a.sync();assert.equal(a.el('prospApp').hidden,true);assert.equal(a.context.resultados.length,0);
 console.log('PASS: login gate, legacy preservation, two-device sync, simultaneous independent fields, offline outbox recovery and revoked access.');
})().catch(e=>{console.error(e);process.exitCode=1});
