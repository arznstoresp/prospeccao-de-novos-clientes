const {test}=require('node:test');
const assert=require('node:assert/strict');
const {prepare}=require('../cloud/csv-import-model.js');
const {phone,project,materialize}=require('../cloud/sync-model.js');
test('imports kit headers, quoted fields, BOM and optional details',()=>{
 const result=prepare('\ufefftitle,phone,website,address,review_rating,place_id,emails\r\n"Clínica ""Teste"", Ltda",+55 (11) 98765-4321,https://example.org,"Rua A, 1\nSão Paulo",4.7,ChIJ-test,ignored@example.org',[],'Clínicas',phone);
 const [lead]=result.leads;
 assert.equal(lead.nome,'Clínica "Teste", Ltda');assert.equal(lead.telNum,'11987654321');assert.equal(lead.rating,4.7);assert.equal(lead.site,'https://example.org/');assert.equal(lead.end,'Rua A, 1\nSão Paulo');assert.equal(lead.origem,'Scraper');assert.equal(lead.nicho,'Clínicas');assert.equal(lead.emails,undefined);
 const docs=project({getItem:k=>k==='prosp_fila'?JSON.stringify([lead]):null},'test');
 const data=materialize(Object.entries(docs).map(([key,doc])=>({key,doc})),'test');
 assert.equal(JSON.parse(data.prosp_fila)[0].origem,'Scraper');
});
test('deduplicates existing and incoming rows and rejects bad data',()=>{
 const csv='Nome;Telefone;Nota;Site;place_id\nJá na fila;(11) 4444-5555;;;\nJá no histórico;11922222222;;;pid-old\nNovo;11912345678;4,5;javascript:alert(1);pid-new\nMesmo ID;11933333333;;;pid-new\nMesmo telefone;+55 11 91234-5678;;;\nSem telefone;;;;\nExterior;+1 212 555 1234;;;\n';
 const result=prepare(csv,[{telNum:'1144445555'},{telNum:'11988888888',placeId:'pid-old'}],'Teste',phone);
 assert.equal(result.duplicates,4);assert.equal(result.discarded,2);assert.equal(result.leads.length,1);assert.equal(result.leads[0].site,'');assert.equal(result.leads[0].rating,4.5);
});
test('rejects malformed, oversized or unrelated files',()=>{
 for(const csv of ['','a,b\n1,2','title,phone\n"ab,11912345678','title,phone\n'+'a,11912345678\n'.repeat(251)])assert.throws(()=>prepare(csv,[],'Teste',phone));
});
