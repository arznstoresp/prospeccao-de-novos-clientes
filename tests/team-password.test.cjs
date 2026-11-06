const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const source=require('node:module').stripTypeScriptTypes(readFileSync(require('node:path').join(__dirname,'../functions/prospect-team-admin.ts'),'utf8').replace(/^import .*\n/,''));
async function test({token=true,actor='admin',active=true,target='staff',targetActive=true,password='Example-only-123',found=true,updateError=false}={}){
 let handler,writes=[];
 const admin={auth:{getUser:async()=>({data:{user:token?{id:'manager',email:'manager@example.test',email_confirmed_at:'yes'}:null},error:!token}),admin:{listUsers:async()=>({data:{users:found?[{id:'seller',email:'seller@example.test'}]:[]}}),updateUserById:async(id,values)=>{writes.push({id,keys:Object.keys(values)});return {error:updateError?{}:null};}}},from:()=>({select:()=>({eq:(_,email)=>({maybeSingle:async()=>({data:email==='manager@example.test'?{role:actor,active}:{role:target,active:targetActive}})})})})};
 runInNewContext(source,{createClient:()=>admin,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response});
 const res=await handler(new Request('https://example.test',{method:'POST',headers:token?{Authorization:'Bearer test-token'}:{},body:JSON.stringify({action:'set_password',email:'seller@example.test',password})}));
 return {status:res.status,body:await res.json(),writes};
}
(async()=>{
 for(const [args,status] of [[{token:false},401],[{actor:'staff'},403],[{active:false},403],[{target:'admin'},403],[{targetActive:false},403],[{password:'short'},400],[{found:false},400]]){const r=await test(args);assert.equal(r.status,status);assert.equal(r.writes.length,0);}
 const ok=await test();assert.equal(ok.status,200);assert.equal(ok.body.ok,true);assert.deepEqual(ok.writes,[{id:'seller',keys:['password']}]);
 const failure=await test({updateError:true});assert.equal(failure.status,400);assert.ok(failure.body.error);
 console.log('9 scenarios passed: unauthenticated/staff/inactive/admin target/short password/missing account/provider failure/admin success');
})().catch(e=>{console.error(e);process.exit(1)});
