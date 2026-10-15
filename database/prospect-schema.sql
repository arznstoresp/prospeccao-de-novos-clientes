create schema if not exists prospect_private;
revoke all on schema prospect_private from public;
grant usage on schema prospect_private to authenticated;
create table public.prospect_members (
 email text primary key check(email=lower(email)), name text not null default '',
 role text not null default 'staff' check(role in ('admin','staff')), active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.prospect_members enable row level security;
create function prospect_private.current_role() returns text language sql stable security definer set search_path='' as $$
 select m.role from public.prospect_members m join auth.users u on lower(u.email)=m.email
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null and m.active limit 1
$$;
revoke all on function prospect_private.current_role() from public,anon;
grant execute on function prospect_private.current_role() to authenticated;
create policy prospect_members_read on public.prospect_members for select to authenticated
using ((select prospect_private.current_role())='admin' or (email=lower((select auth.jwt())->>'email') and active));
-- Account provisioning is performed only by the authenticated admin Edge Function.
grant select on public.prospect_members to authenticated;
revoke all on public.prospect_members from anon;
create table public.prospect_records (
 key text primary key check(length(key)<180), doc jsonb not null default '{}'::jsonb check(jsonb_typeof(doc)='object'),
 deleted boolean not null default false, revision bigint not null default 1,
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
alter table public.prospect_records enable row level security;
create function prospect_private.allowed_record(k text) returns boolean language sql stable security invoker set search_path='' as $$
 select (select prospect_private.current_role()) is not null and (
 k ~ '^lead:[0-9]{10,11}$' or
 k in ('cfg:prosp_enderecos','cfg:prosp_ativo','cfg:prosp_assin','cfg:prosp_msgs','cfg:prosp_alan_wa','cfg:prosp_proxy') or
 k like 'usr:'||(select auth.uid())::text||':%' or
 ((select prospect_private.current_role())='admin' and k like 'usr:%'))
$$;
revoke all on function prospect_private.allowed_record(text) from public,anon;
grant execute on function prospect_private.allowed_record(text) to authenticated;
create policy prospect_records_read on public.prospect_records for select to authenticated using (prospect_private.allowed_record(key));
create policy prospect_records_insert on public.prospect_records for insert to authenticated with check (prospect_private.allowed_record(key) and updated_by=(select auth.uid()));
create policy prospect_records_update on public.prospect_records for update to authenticated using (prospect_private.allowed_record(key)) with check (prospect_private.allowed_record(key) and updated_by=(select auth.uid()));
grant select,insert,update on public.prospect_records to authenticated;
revoke all on public.prospect_records from anon;
create table public.prospect_batches (
 id uuid primary key, actor uuid not null references auth.users(id), created_at timestamptz not null default now()
);
alter table public.prospect_batches enable row level security;
create policy prospect_batches_read on public.prospect_batches for select to authenticated using(actor=(select auth.uid()) and (select prospect_private.current_role()) is not null);
create policy prospect_batches_insert on public.prospect_batches for insert to authenticated with check(actor=(select auth.uid()) and (select prospect_private.current_role()) is not null);
grant select,insert on public.prospect_batches to authenticated;
revoke all on public.prospect_batches from anon;
create table public.prospect_audit (
 id bigint generated always as identity primary key, record_key text not null, actor uuid not null references auth.users(id),
 before_doc jsonb, after_doc jsonb, was_deleted boolean, is_deleted boolean,
 created_at timestamptz not null default now()
);
alter table public.prospect_audit enable row level security;
create policy prospect_audit_read on public.prospect_audit for select to authenticated using((select prospect_private.current_role())='admin');
create policy prospect_audit_insert on public.prospect_audit for insert to authenticated with check(actor=(select auth.uid()) and prospect_private.allowed_record(record_key));
grant select,insert on public.prospect_audit to authenticated;
grant usage on sequence public.prospect_audit_id_seq to authenticated;
revoke all on public.prospect_audit from anon;
create function public.prospect_apply(changes jsonb,batch_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare c jsonb; k text; current_row public.prospect_records; next_doc jsonb; next_deleted boolean; inserted integer;
begin
 if (select prospect_private.current_role()) is null then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>500 or octet_length(changes::text)>2000000 then raise exception 'Lote inválido'; end if;
 insert into public.prospect_batches(id,actor) values(batch_id,auth.uid()) on conflict do nothing;
 get diagnostics inserted=row_count; if inserted=0 then return; end if;
 for c in select value from jsonb_array_elements(changes) loop
  k=c->>'key';
  if not prospect_private.allowed_record(k) then raise exception 'Registro não autorizado' using errcode='42501';end if;
  if jsonb_typeof(c->'patch')<>'object' then raise exception 'Alteração inválida';end if;
  -- Serializes mutations for a contact, including the first insert.
  perform pg_advisory_xact_lock(hashtextextended(k,0));
  select * into current_row from public.prospect_records where key=k for update;
  if found and current_row.deleted then continue;end if;
  next_doc=coalesce(current_row.doc,'{}'::jsonb)||(c->'patch');
  -- A stale queue cannot move a contacted lead back out of the CRM.
  if current_row.doc->>'bucket'='history' then next_doc=jsonb_set(next_doc,'{bucket}','"history"');end if;
  next_deleted=coalesce((c->>'deleted')::boolean,false);
  insert into public.prospect_records(key,doc,deleted,updated_by) values(k,next_doc,next_deleted,auth.uid())
   on conflict(key) do update set doc=excluded.doc,deleted=excluded.deleted,revision=public.prospect_records.revision+1,updated_at=now(),updated_by=auth.uid();
  insert into public.prospect_audit(record_key,actor,before_doc,after_doc,was_deleted,is_deleted)
   values(k,auth.uid(),current_row.doc,next_doc,current_row.deleted,next_deleted);
 end loop;
end $$;
revoke all on function public.prospect_apply(jsonb,uuid) from public,anon;
grant execute on function public.prospect_apply(jsonb,uuid) to authenticated;
insert into public.prospect_members(email,name,role) select lower(email),'Alan','admin' from auth.users where lower(email)='arznstore22@gmail.com' and email_confirmed_at is not null;
create index prospect_records_updated_idx on public.prospect_records(updated_at);
create index prospect_audit_actor_idx on public.prospect_audit(actor);
create index prospect_audit_record_idx on public.prospect_audit(record_key,created_at);
create index prospect_batches_actor_idx on public.prospect_batches(actor);

-- Migração adicional prospect_index_record_actor
create index prospect_records_updated_by_idx on public.prospect_records(updated_by);

-- Migração prospect_explicit_least_privilege_grants
revoke all on public.prospect_members from authenticated;
grant select on public.prospect_members to authenticated;
revoke all on public.prospect_records from authenticated;
grant select,insert,update on public.prospect_records to authenticated;
revoke all on public.prospect_batches from authenticated;
grant select,insert on public.prospect_batches to authenticated;
revoke all on public.prospect_audit from authenticated;
grant select,insert on public.prospect_audit to authenticated;
revoke all on sequence public.prospect_audit_id_seq from authenticated;
grant usage on sequence public.prospect_audit_id_seq to authenticated;

-- prospect_manager_only_shared_configuration
alter policy prospect_records_insert on public.prospect_records with check (prospect_private.allowed_record(key) and updated_by=(select auth.uid()) and (key not like 'cfg:%' or (select prospect_private.current_role())='admin'));
alter policy prospect_records_update on public.prospect_records using (prospect_private.allowed_record(key) and (key not like 'cfg:%' or (select prospect_private.current_role())='admin')) with check (prospect_private.allowed_record(key) and updated_by=(select auth.uid()) and (key not like 'cfg:%' or (select prospect_private.current_role())='admin'));

-- prospect_atomic_lead_ownership
create or replace function prospect_private.guard_lead_owner() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.key like 'lead:%' and prospect_private.current_role()<>'admin' then
  if tg_op='UPDATE' and coalesce(old.doc->>'ownerId','')<>'' and old.doc->>'ownerId'<>coalesce(new.doc->>'ownerId','') then raise exception 'Somente o gestor pode transferir um contato.' using errcode='42501';end if;
  if coalesce(new.doc->>'ownerId','')<>'' and new.doc->>'ownerId'<>auth.uid()::text and (tg_op='INSERT' or old.doc->>'ownerId' is distinct from new.doc->>'ownerId') then raise exception 'Assuma o contato com sua própria conta.' using errcode='42501';end if;
 end if;
 return new;
end $$;
revoke all on function prospect_private.guard_lead_owner() from public,anon;
grant execute on function prospect_private.guard_lead_owner() to authenticated;
create trigger prospect_guard_lead_owner before insert or update on public.prospect_records for each row execute function prospect_private.guard_lead_owner();