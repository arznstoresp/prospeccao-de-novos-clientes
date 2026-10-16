'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=fs.existsSync(path.join(__dirname,'../cloud/workflow-model.js'))?path.join(__dirname,'../cloud'):__dirname;
const W=require(path.join(root,'workflow-model.js')),S=require(path.join(root,'sync-model.js'));
const today='2026-10-16';
const rows=[
 {nome:'Futuro',ownerId:'emily',followUp:'2026-10-20'},
 {nome:'Hoje',ownerId:'emily',followUp:today},
 {nome:'Encerrado',ownerId:'emily',status:'nao',followUp:'2026-10-01'},
 {nome:'Gestor',ownerId:'emily',nextActionOwner:'manager',followUp:today},
 {nome:'Orçamento',ownerId:'emily',quoteState:'requested',followUp:today},
 {nome:'Sem data',ownerId:'emily'},
 {nome:'Outra pessoa',ownerId:'alan',followUp:'2026-10-01'},
 {nome:'Vencido',ownerId:'emily',followUp:'2026-10-15'}
];
assert.deepEqual(W.workQueue(rows,'emily',today).map(x=>x.h.nome),['Vencido','Hoje','Sem data','Futuro']);
assert(W.closureError({},'nao'));assert(W.closureError({closeReason:'numero'},'nao'));
assert.equal(W.closureError({closeReason:'nao_contatar'},'nao'),'');
assert(W.closureError({closeReason:'outro'},'invalido'));
assert.equal(W.closureError({closeReason:'outro',closeDetail:'Empresa trocou de canal'},'invalido'),'');
assert.equal(W.closureError({},'interesse'),'');
const report=W.closureSnapshot([{nicho:'Academias',status:'nao',closeReason:'preco'},{nicho:'Academias',status:'nao'},{nicho:'Academias',status:'interesse',closeReason:'preco'}]);
assert.equal(report.Academias['Preço / orçamento disponível'],1);
assert.equal(report.Academias['Sem motivo registrado (legado)'],1);
const brief=W.quoteBrief({nome:'Exemplo',qQty:'30',qProduct:'Caneca',notas:'Informação interna'});
assert(brief.includes('Quantidade aproximada: 30'));assert(!brief.includes('Informação interna'));assert(brief.includes('A confirmar'));
assert(S.PERSONAL.includes('prosp_launch_checks'));
const storage={getItem:k=>k==='prosp_launch_checks'?'{"whatsapp":true}':null};
const docs=S.project(storage,'emily');
assert(docs['usr:emily:prosp_launch_checks']);assert(!docs['usr:alan:prosp_launch_checks']);
assert.equal(S.materialize(Object.entries(docs).map(([key,doc])=>({key,doc})),'alan').prosp_launch_checks,undefined);
console.log('PASS: prioridade da fila, isolamento, motivos de encerramento, legado preservado e ficha de cotação sem notas internas.');

const vm=require('node:vm'),source=fs.readFileSync(path.join(root,'workflow.js'),'utf8');
const begin=source.indexOf("$('wfStage').onchange="),end=source.indexOf("\n $('wfLoadTimeline')",begin);
const stage={value:'nao'},lead={status:'novo',closeReason:'nao_contatar'};let changed='';
const ctx={$:id=>stage,flush:()=>{stage.value='novo';return true;},find:()=>lead,W,admin:()=>false,mine:()=>true,setQuickStatus:(_,s)=>{changed=s;},updateDialogSummary(){},loadTimeline(){},confirm:()=>true,saveStatus(){}};
vm.runInNewContext('const tel="11900000000";'+source.slice(begin,end),ctx);stage.onchange();
assert.equal(changed,'nao','A etapa escolhida deve sobreviver ao flush do rascunho');
console.log('PASS: troca de etapa preservada durante salvamento pendente.');
