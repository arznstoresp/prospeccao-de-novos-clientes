import { createClient } from 'npm:@supabase/supabase-js@2.102.0';
const origin='https://arznstoresp.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
Deno.serve(async(req:Request)=>{
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Método não permitido'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'Entre na sua conta.'},401);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(token);
 if(authError||!user?.email||!user.email_confirmed_at)return reply({error:'Sessão inválida.'},401);
 const {data:manager}=await admin.from('prospect_members').select('role,active').eq('email',user.email.toLowerCase()).maybeSingle();
 if(!manager?.active||manager.role!=='admin')return reply({error:'Somente o gestor pode administrar acessos.'},403);
 let body;try{body=await req.json();}catch{return reply({error:'Pedido inválido.'},400);}
 const email=String(body.email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return reply({error:'Informe um e-mail válido.'},400);
 if(body.action==='toggle'){
  const {data:target}=await admin.from('prospect_members').select('role').eq('email',email).maybeSingle();
  if(!target||target.role==='admin')return reply({error:'Este acesso não pode ser alterado aqui.'},400);
  const {error}=await admin.from('prospect_members').update({active:body.active===true}).eq('email',email);
  return error?reply({error:'Não foi possível alterar o acesso.'},500):reply({ok:true});
 }
 if(body.action==='set_password'){
  const password=typeof body.password==='string'?body.password:'';
  if(password.length<12||password.length>128)return reply({error:'Use uma senha de 12 a 128 caracteres.'},400);
  const {data:target,error:targetError}=await admin.from('prospect_members').select('role,active').eq('email',email).maybeSingle();
  if(targetError)return reply({error:'Não foi possível conferir o acesso.'},500);
  if(!target||target.role!=='staff'||!target.active)return reply({error:'Selecione uma vendedora com acesso ativo.'},403);
  let targetId:string|null=null;
  for(let page=1;page<=1000;page++){
   const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});
   if(error)return reply({error:'Não foi possível localizar a conta.'},500);
   const match=data.users.find(u=>u.email?.toLowerCase()===email);
   if(match){targetId=match.id;break;}
   if(data.users.length<1000)break;
  }
  if(!targetId||targetId===user.id)return reply({error:'Conta da vendedora não encontrada.'},400);
  const {error}=await admin.auth.admin.updateUserById(targetId,{password});
  if(error)return reply({error:'Não foi possível definir a senha. Use de 12 a 128 caracteres e confira os requisitos de segurança.'},400);
  return reply({ok:true,message:'Senha definida. A vendedora já pode entrar com a nova senha. Ela também vale para a Central de Vendas.'});
 }
 if(body.action!=='create')return reply({error:'Ação inválida.'},400);
 const name=String(body.name||'').trim().slice(0,100),password=String(body.password||'');
 if(!name||password.length<12||password.length>128)return reply({error:'Informe o nome e uma senha inicial de 12 a 128 caracteres.'},400);
 // Reset credentials only for existing staff memberships, after manager authentication.
 const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true});
 if(createError){
  if(createError.code==='email_exists'||createError.code==='email_exists_error'||/already|registered/i.test(createError.message)){
   const {data:existing,error:memberError}=await admin.from('prospect_members').select('role').eq('email',email).maybeSingle();
   if(memberError)return reply({error:'Não foi possível conferir o acesso existente.'},500);
   if(existing?.role==='admin')return reply({error:'O acesso do gestor não pode ser alterado neste formulário.'},403);
   if(existing?.role==='staff'){
    let staffId:string|null=null;
    for(let page=1;page<=1000;page++){
     const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});
     if(error)return reply({error:'Não foi possível localizar a conta.'},500);
     const match=data.users.find(u=>u.email?.toLowerCase()===email);
     if(match){staffId=match.id;break;}
     if(data.users.length<1000)break;
    }
    if(!staffId||staffId===user.id)return reply({error:'Conta da vendedora não encontrada.'},400);
    const {error:passwordError}=await admin.auth.admin.updateUserById(staffId,{password});
    if(passwordError)return reply({error:'Não foi possível salvar a senha. Confira os requisitos e tente novamente.'},400);
    const {data:updated,error:reactivateError}=await admin.from('prospect_members').update({active:true}).eq('email',email).eq('role','staff').select('email').maybeSingle();
    if(reactivateError||!updated)return reply({error:'Senha salva, mas não foi possível reativar o acesso. Clique em Reativar na lista.'},500);
    return reply({ok:true,existing:true,message:'Senha atualizada e acesso reativado. A vendedora já pode entrar com a senha que você informou. Ela também vale na Central de Vendas.'});
   }
   const {error}=await admin.from('prospect_members').upsert({email,name,role:'staff',active:true},{onConflict:'email',ignoreDuplicates:true});
   return error?reply({error:'Não foi possível liberar este acesso.'},500):reply({ok:true,existing:true,message:'Conta já existente vinculada à equipe. Use Definir senha para alterar sua senha atual.'});
  }
  return reply({error:'Não foi possível criar a conta. Confira o e-mail e os requisitos da senha.'},400);
 }
 const {error}=await admin.from('prospect_members').insert({email,name,role:'staff',active:true});
 if(error)return reply({error:'Conta criada, mas a liberação falhou. Tente liberar novamente; a senha não será alterada.'},500);
 return reply({ok:true,message:'Conta criada. Compartilhe o link e a senha inicial diretamente com a funcionária.'});
});
