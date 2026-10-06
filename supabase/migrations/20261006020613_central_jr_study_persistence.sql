-- Approved external study storage. Never creates or copies credentials.
create schema if not exists jr_private;
revoke all on schema jr_private from public, anon;
grant usage on schema jr_private to authenticated;

create table public.jr_exams (
 id integer generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 name varchar(180) not null check(length(trim(name))>=2), institution varchar(180) not null,
 date date not null, phase varchar(180) not null default 'Prova principal',
 priority text not null check(priority in ('principal','alta','media','baixa')),
 status text not null default 'active' check(status in ('active','completed','archived')),
 color text not null default 'mint', notes text,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 revision integer not null default 1, unique(id,user_id)
);
create table public.jr_topics (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 exam_id integer not null, name varchar(180) not null, subject varchar(180) not null,
 weight integer not null default 3 check(weight between 1 and 5),
 status text not null default 'not_started' check(status in ('not_started','in_progress','review','needs_help','done')),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), revision integer not null default 1,
 unique(id,user_id), foreign key(exam_id,user_id) references public.jr_exams(id,user_id) on delete cascade
);
create table public.jr_essays (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 exam_id integer, title varchar(180) not null check(length(trim(title))>=2), theme text, bank varchar(80) not null default 'ENEM',
 status text not null default 'draft' check(status in ('draft','submitted_for_review','feedback_received','revision_needed','revised')),
 current_text text not null default '' check(octet_length(current_text)<=4000000), source text not null default 'editor',
 file_key text, total_score integer check(total_score between 0 and 1000),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), revision integer not null default 1,
 unique(id,user_id), foreign key(exam_id,user_id) references public.jr_exams(id,user_id)
);
create table public.jr_parts (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 essay_id integer not null, name varchar(100) not null, color text not null check(color in ('blue','pink','mint','orange','yellow')),
 sort_order integer not null default 0, deleted_at timestamptz,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), revision integer not null default 1,
 unique(id,user_id), foreign key(essay_id,user_id) references public.jr_essays(id,user_id) on delete cascade
);
create table public.jr_versions (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 essay_id integer not null, version_number integer not null, text text not null, snapshot jsonb not null,
 origin text not null default 'editor', created_at timestamptz not null default clock_timestamp(),
 foreign key(essay_id,user_id) references public.jr_essays(id,user_id) on delete cascade, unique(essay_id,version_number)
);
create table public.jr_feedback (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 essay_id integer not null, origin varchar(40) not null, total_score integer check(total_score between 0 and 1000),
 competence1 integer check(competence1 between 0 and 200), competence2 integer check(competence2 between 0 and 200),
 competence3 integer check(competence3 between 0 and 200), competence4 integer check(competence4 between 0 and 200),
 competence5 integer check(competence5 between 0 and 200), notes text, created_at timestamptz not null default clock_timestamp(),
 foreign key(essay_id,user_id) references public.jr_essays(id,user_id) on delete cascade
);
create table public.jr_blocks (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 exam_id integer, essay_id integer, topic_id integer, resource_id integer,
 title varchar(180) not null, kind text not null, date date not null,
 start_time text not null, end_time text not null, duration_minutes integer not null check(duration_minutes>0 and duration_minutes<=600),
 status text not null default 'planned' check(status in ('planned','accepted','in_progress','completed','partially_completed','postponed','cancelled')),
 reason text, minimum_version text, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 revision integer not null default 1, unique(id,user_id),
 foreign key(exam_id,user_id) references public.jr_exams(id,user_id) on delete cascade,
 foreign key(essay_id,user_id) references public.jr_essays(id,user_id) on delete cascade,
 foreign key(topic_id,user_id) references public.jr_topics(id,user_id),
 check(exam_id is not null or essay_id is not null)
);
create table public.jr_sessions (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 block_id integer not null, started_at timestamptz not null, ended_at timestamptz,
 status text not null check(status in ('running','paused','completed','cancelled')),
 accumulated_ms bigint not null default 0 check(accumulated_ms>=0), last_resumed_at timestamptz,
 actual_minutes numeric, confidence integer, objective_reached integer, difficulty text, next_step text, evidence text,
 revision integer not null default 1, created_at timestamptz not null default clock_timestamp(),
 unique(id,user_id), foreign key(block_id,user_id) references public.jr_blocks(id,user_id) on delete cascade,
 check((status='running')=(last_resumed_at is not null)),
 check((status in ('completed','cancelled'))=(ended_at is not null))
);
create unique index jr_one_active_flow on public.jr_sessions(user_id) where status in ('running','paused');
create table public.jr_periods (
 id integer generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate,
 session_id integer not null, started_at timestamptz not null, ended_at timestamptz,
 elapsed_ms bigint check(elapsed_ms>=0), created_at timestamptz not null default clock_timestamp(),
 foreign key(session_id,user_id) references public.jr_sessions(id,user_id) on delete cascade,
 check((ended_at is null)=(elapsed_ms is null)), check(ended_at is null or ended_at>=started_at)
);
create unique index jr_one_open_period on public.jr_periods(session_id) where ended_at is null;
create table public.jr_commands (
 user_id uuid not null references auth.users(id) on delete cascade deferrable initially immediate, request_id uuid not null,
 operation text not null, payload jsonb not null, result jsonb not null, created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,request_id)
);

create function jr_private.touch_row() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.revision:=old.revision+1; new.updated_at:=clock_timestamp(); return new; end $$;
do $$
declare t text;
begin
 foreach t in array array['jr_exams','jr_topics','jr_essays','jr_parts','jr_versions','jr_feedback','jr_blocks','jr_sessions','jr_periods','jr_commands'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_access on public.%I to authenticated using ((select auth.uid())=user_id and not coalesce((select auth.jwt()->>''is_anonymous'')::boolean,false)) with check ((select auth.uid())=user_id and not coalesce((select auth.jwt()->>''is_anonymous'')::boolean,false))',t);
  execute format('create index %I on public.%I(user_id)',t||'_owner',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t not in ('jr_sessions','jr_periods') then
   execute format('grant insert,update,delete on public.%I to authenticated',t);
  end if;
  if t in ('jr_exams','jr_topics','jr_essays','jr_parts','jr_blocks') then
   execute format('create trigger touch before update on public.%I for each row execute function jr_private.touch_row()',t);
  end if;
 end loop;
end $$;
grant usage,select on sequence public.jr_exams_id_seq,public.jr_topics_id_seq,public.jr_essays_id_seq,public.jr_parts_id_seq,public.jr_versions_id_seq,public.jr_feedback_id_seq,public.jr_blocks_id_seq to authenticated;
create index jr_topics_exam on public.jr_topics(exam_id,user_id);
create index jr_essays_exam on public.jr_essays(exam_id,user_id);
create index jr_parts_essay on public.jr_parts(essay_id,user_id);
create index jr_versions_essay on public.jr_versions(essay_id,user_id);
create index jr_feedback_essay on public.jr_feedback(essay_id,user_id);
create index jr_blocks_exam on public.jr_blocks(exam_id,user_id);
create index jr_blocks_essay on public.jr_blocks(essay_id,user_id);
create index jr_blocks_topic on public.jr_blocks(topic_id,user_id);
create index jr_sessions_block on public.jr_sessions(block_id,user_id);
create index jr_periods_session on public.jr_periods(session_id,user_id);

-- Only narrowly scoped lifecycle commands elevate privileges. Direct writes to
-- official session times and periods remain forbidden for authenticated clients.
create function jr_private.flow_command(op text,p jsonb,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.jr_sessions; b public.jr_blocks; now_at timestamptz; delta bigint;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'UNAUTHORIZED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 now_at:=clock_timestamp();
 if op='flows.start' then
  if exists(select 1 from public.jr_sessions where user_id=u and status in ('running','paused')) then raise exception 'ACTIVE_FLOW'; end if;
  select * into b from public.jr_blocks where id=(p->>'blockId')::integer and user_id=u for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if b.status not in ('planned','accepted','postponed','partially_completed') then raise exception 'INVALID_STATE'; end if;
  if exists(select 1 from public.jr_exams where id=b.exam_id and user_id=u and status<>'active') then raise exception 'INVALID_STATE'; end if;
  insert into public.jr_sessions(user_id,block_id,started_at,status,last_resumed_at) values(u,b.id,now_at,'running',now_at) returning * into s;
  insert into public.jr_periods(user_id,session_id,started_at) values(u,s.id,now_at);
  update public.jr_blocks set status='in_progress' where id=b.id and user_id=u;
  return jsonb_build_object('id',s.id,'revision',s.revision);
 end if;
 select * into s from public.jr_sessions where id=(p->>'id')::integer and user_id=u for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 now_at:=greatest(now_at,s.started_at);
 if expected_revision is null or s.revision<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
 if op='flows.resume' then
  if s.status<>'paused' then raise exception 'INVALID_STATE'; end if;
  insert into public.jr_periods(user_id,session_id,started_at) values(u,s.id,now_at);
  update public.jr_sessions set status='running',last_resumed_at=now_at,revision=revision+1 where id=s.id and user_id=u returning * into s;
 else
  if op not in ('flows.pause','flows.complete','flows.cancel') then raise exception 'INVALID_OPERATION'; end if;
  if s.status not in ('running','paused') or (op='flows.pause' and s.status<>'running') then raise exception 'INVALID_STATE'; end if;
  delta:=case when s.status='running' then greatest(0,floor(extract(epoch from (now_at-s.last_resumed_at))*1000)::bigint) else 0 end;
  if s.status='running' then
   update public.jr_periods set ended_at=greatest(now_at,started_at),elapsed_ms=delta where session_id=s.id and user_id=u and ended_at is null;
  end if;
  update public.jr_sessions set
   accumulated_ms=accumulated_ms+delta,last_resumed_at=null,revision=revision+1,
   status=case op when 'flows.pause' then 'paused' when 'flows.complete' then 'completed' else 'cancelled' end,
   ended_at=case when op='flows.pause' then null else now_at end,
   actual_minutes=case when op='flows.pause' then null else (accumulated_ms+delta)::numeric/60000 end
  where id=s.id and user_id=u returning * into s;
  if op<>'flows.pause' then update public.jr_blocks set status=case when op='flows.complete' then 'completed' else 'postponed' end where id=s.block_id and user_id=u; end if;
 end if;
 return jsonb_build_object('success',true,'id',s.id,'revision',s.revision,'actualMinutes',s.actual_minutes);
end $$;
revoke all on function jr_private.flow_command(text,jsonb,integer) from public,anon;
grant execute on function jr_private.flow_command(text,jsonb,integer) to authenticated;

create function public.jr_study_snapshot() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
  'serverNow',clock_timestamp(),
  'exams',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from public.jr_exams t where user_id=(select auth.uid())),'[]'::jsonb),
  'topics',coalesce((select jsonb_agg(to_jsonb(t)) from public.jr_topics t where user_id=(select auth.uid())),'[]'::jsonb),
  'essays',coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from public.jr_essays t where user_id=(select auth.uid())),'[]'::jsonb),
  'parts',coalesce((select jsonb_agg(to_jsonb(t) order by sort_order) from public.jr_parts t where user_id=(select auth.uid()) and deleted_at is null),'[]'::jsonb),
  'versions',coalesce((select jsonb_agg(to_jsonb(t) order by version_number desc) from public.jr_versions t where user_id=(select auth.uid())),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from public.jr_feedback t where user_id=(select auth.uid())),'[]'::jsonb),
  'blocks',coalesce((select jsonb_agg(to_jsonb(t) order by date,start_time) from public.jr_blocks t where user_id=(select auth.uid())),'[]'::jsonb),
  'sessions',coalesce((select jsonb_agg(to_jsonb(t) order by started_at desc) from public.jr_sessions t where user_id=(select auth.uid())),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(to_jsonb(t) order by started_at) from public.jr_periods t where user_id=(select auth.uid())),'[]'::jsonb)
 );
$$;
revoke all on function public.jr_study_snapshot() from public,anon;
grant execute on function public.jr_study_snapshot() to authenticated;

create function public.jr_study_mutate(operation text,payload jsonb,request_id uuid,expected_revision integer default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); rid integer; r jsonb; old_command public.jr_commands; e public.jr_essays;
 v public.jr_versions; part public.jr_parts; item jsonb; n integer; target_essay integer;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'UNAUTHORIZED'; end if;
 if request_id is null or jsonb_typeof(payload)<>'object' then raise exception 'INVALID_INPUT'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||request_id::text,0));
 select * into old_command from public.jr_commands c where c.user_id=u and c.request_id=jr_study_mutate.request_id;
 if found then
  if old_command.operation<>operation or old_command.payload<>payload then raise exception 'INVALID_REQUEST'; end if;
  return old_command.result;
 end if;
 if operation in ('flows.start','flows.pause','flows.resume','flows.complete','flows.cancel') then
  r:=jr_private.flow_command(operation,payload,expected_revision);
 elsif operation='exams.create' then
  insert into public.jr_exams(user_id,name,institution,date,priority,phase,color,notes) values(u,payload->>'name',payload->>'institution',(payload->>'date')::date,coalesce(payload->>'priority','alta'),coalesce(payload->>'phase','Prova principal'),coalesce(payload->>'color','mint'),payload->>'notes') returning id into rid;
 elsif operation='exams.update' then
  update public.jr_exams set name=payload->>'name',institution=payload->>'institution',date=(payload->>'date')::date,priority=payload->>'priority',notes=payload->>'notes',
   phase=coalesce(payload->>'phase',phase),color=coalesce(payload->>'color',color)
  where id=(payload->>'id')::integer and user_id=u returning id into rid;
 elsif operation in ('exams.close','exams.delete') then
  rid:=(payload->>'id')::integer;
  if not exists(select 1 from public.jr_exams where id=rid and user_id=u) then raise exception 'NOT_FOUND'; end if;
  if exists(select 1 from public.jr_sessions s join public.jr_blocks b on b.id=s.block_id and b.user_id=s.user_id where s.user_id=u and b.exam_id=rid and s.status in ('running','paused')) then raise exception 'ACTIVE_FLOW'; end if;
  if operation='exams.close' then update public.jr_exams set status=coalesce(payload->>'status','completed') where id=rid and user_id=u;
  else
   update public.jr_essays set exam_id=null where exam_id=rid and user_id=u;
   delete from public.jr_exams where id=rid and user_id=u;
  end if;
 elsif operation='exams.createTopic' then
  insert into public.jr_topics(user_id,exam_id,name,subject,weight) values(u,(payload->>'examId')::integer,payload->>'name',payload->>'subject',coalesce((payload->>'weight')::integer,3)) returning id into rid;
 elsif operation='exams.updateTopic' then
  update public.jr_topics set name=payload->>'name',subject=payload->>'subject',weight=(payload->>'weight')::integer,status=coalesce(payload->>'status',status) where id=(payload->>'id')::integer and user_id=u returning id into rid;
 elsif operation='exams.deleteTopic' then
  rid:=(payload->>'id')::integer;
  if not exists(select 1 from public.jr_topics where id=rid and user_id=u) then raise exception 'NOT_FOUND'; end if;
  update public.jr_blocks set topic_id=null where topic_id=rid and user_id=u;
  delete from public.jr_topics where id=rid and user_id=u;
 elsif operation='essays.create' then
  insert into public.jr_essays(user_id,title,theme,bank,source,exam_id) values(u,payload->>'title',payload->>'theme',coalesce(payload->>'bank','ENEM'),'editor',(payload->>'examId')::integer) returning id into rid;
 elsif operation in ('essays.save','essays.autosave','essays.restoreVersion','essays.applyPart') then
  target_essay:=coalesce((payload->>'id')::integer,(payload->>'essayId')::integer);
  select * into e from public.jr_essays where id=target_essay and user_id=u for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if expected_revision is null or e.revision<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if operation='essays.restoreVersion' then
   select * into v from public.jr_versions where id=(payload->>'versionId')::integer and essay_id=e.id and user_id=u;
   if not found then raise exception 'NOT_FOUND'; end if;
   update public.jr_parts set deleted_at=clock_timestamp() where essay_id=e.id and user_id=u;
   for item in select value from jsonb_array_elements(v.snapshot->'parts') loop
    update public.jr_parts set name=item->>'name',color=item->>'color',sort_order=(item->>'sort_order')::integer,deleted_at=null where id=(item->>'id')::integer and essay_id=e.id and user_id=u;
   end loop;
   update public.jr_essays set title=v.snapshot->'essay'->>'title',theme=v.snapshot->'essay'->>'theme',bank=v.snapshot->'essay'->>'bank',current_text=v.text,status=v.snapshot->'essay'->>'status' where id=e.id and user_id=u returning * into e;
  elsif operation='essays.applyPart' then
   if not exists(select 1 from public.jr_parts where id=(payload->>'partId')::integer and essay_id=e.id and user_id=u and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
   update public.jr_essays set current_text=payload->>'currentText' where id=e.id and user_id=u returning * into e;
  else
   update public.jr_essays set title=payload->>'title',theme=payload->>'theme',current_text=payload->>'currentText',status=coalesce(payload->>'status',status) where id=e.id and user_id=u returning * into e;
  end if;
  if operation in ('essays.save','essays.restoreVersion') then
   select coalesce(max(version_number),0)+1 into n from public.jr_versions where essay_id=e.id and user_id=u;
   insert into public.jr_versions(user_id,essay_id,version_number,text,snapshot,origin)
   values(u,e.id,n,e.current_text,jsonb_build_object('essay',to_jsonb(e),'parts',coalesce((select jsonb_agg(to_jsonb(t) order by sort_order) from public.jr_parts t where essay_id=e.id and user_id=u and deleted_at is null),'[]'::jsonb)),case when operation='essays.restoreVersion' then 'restoration' else 'editor' end);
  end if;
  r:=jsonb_build_object('saved',true,'id',e.id,'revision',e.revision,'versionNumber',coalesce(n,0));
 elsif operation='essays.delete' then
  rid:=(payload->>'id')::integer;
  if not exists(select 1 from public.jr_essays where id=rid and user_id=u) then raise exception 'NOT_FOUND'; end if;
  if exists(select 1 from public.jr_sessions s join public.jr_blocks b on b.id=s.block_id and b.user_id=s.user_id where b.essay_id=rid and s.user_id=u and s.status in ('running','paused')) then raise exception 'ACTIVE_FLOW'; end if;
  delete from public.jr_essays where id=rid and user_id=u;
 elsif operation='essays.createPart' then
  insert into public.jr_parts(user_id,essay_id,name,color,sort_order) values(u,(payload->>'essayId')::integer,payload->>'name',coalesce(payload->>'color','blue'),coalesce((select max(sort_order)+1 from public.jr_parts where essay_id=(payload->>'essayId')::integer and user_id=u and deleted_at is null),0)) returning id into rid;
 elsif operation in ('essays.updatePart','essays.deletePart') then
  select * into part from public.jr_parts where id=(payload->>'id')::integer and user_id=u and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if operation='essays.updatePart' then
   update public.jr_parts set name=payload->>'name',color=payload->>'color' where id=part.id and user_id=u;
  else
   update public.jr_parts set deleted_at=clock_timestamp() where id=part.id and user_id=u;
   update public.jr_essays set current_text=replace(current_text,' data-part-id="'||part.id||'"','') where id=part.essay_id and user_id=u;
  end if;
  rid:=part.id;
 elsif operation='essays.reorderParts' then
  target_essay:=(payload->>'essayId')::integer;
  select count(*) into n from public.jr_parts where essay_id=target_essay and user_id=u and deleted_at is null;
  if n<>jsonb_array_length(payload->'partIds') or n<>(select count(distinct value) from jsonb_array_elements(payload->'partIds')) then raise exception 'INVALID_INPUT'; end if;
  for item in select value from jsonb_array_elements(payload->'partIds') loop
   if not exists(select 1 from public.jr_parts where id=(item#>>'{}')::integer and essay_id=target_essay and user_id=u and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  end loop;
  update public.jr_parts t set sort_order=a.ordinality-1 from jsonb_array_elements_text(payload->'partIds') with ordinality a where t.id=a.value::integer and t.essay_id=target_essay and t.user_id=u;
  r:=jsonb_build_object('success',true);
 elsif operation='essays.feedback' then
  insert into public.jr_feedback(user_id,essay_id,origin,total_score,competence1,competence2,competence3,competence4,competence5,notes) values(u,(payload->>'essayId')::integer,payload->>'origin',(payload->>'totalScore')::integer,(payload->>'competence1')::integer,(payload->>'competence2')::integer,(payload->>'competence3')::integer,(payload->>'competence4')::integer,(payload->>'competence5')::integer,payload->>'notes') returning id into rid;
  update public.jr_essays set status='feedback_received',total_score=(payload->>'totalScore')::integer where id=(payload->>'essayId')::integer and user_id=u;
 elsif operation='flows.createAdHoc' then
  if exists(select 1 from public.jr_sessions where user_id=u and status in ('running','paused')) then raise exception 'ACTIVE_FLOW'; end if;
  if ((payload->>'examId') is null)=((payload->>'essayId') is null) then raise exception 'INVALID_INPUT'; end if;
  insert into public.jr_blocks(user_id,exam_id,essay_id,title,kind,date,start_time,end_time,duration_minutes,reason,minimum_version)
  values(u,(payload->>'examId')::integer,(payload->>'essayId')::integer,
   'Flow · '||coalesce((select name from public.jr_exams where id=(payload->>'examId')::integer and user_id=u and status='active'),(select title from public.jr_essays where id=(payload->>'essayId')::integer and user_id=u)),
   'flow',(clock_timestamp() at time zone 'America/Sao_Paulo')::date,to_char(clock_timestamp() at time zone 'America/Sao_Paulo','HH24:MI'),to_char((clock_timestamp()+interval '50 minutes') at time zone 'America/Sao_Paulo','HH24:MI'),50,'Sessão iniciada a partir deste objetivo.','Use o tempo disponível.') returning id into rid;
 elsif operation='planning.generate' then
  n:=0;
  for item in select value from jsonb_array_elements(payload->'_blocks') loop
   if not exists(select 1 from public.jr_blocks where user_id=u and date=(item->>'date')::date and start_time=item->>'startTime') then
    insert into public.jr_blocks(user_id,exam_id,topic_id,title,kind,date,start_time,end_time,duration_minutes,reason,minimum_version)
    values(u,(item->>'examId')::integer,(item->>'topicId')::integer,item->>'title',item->>'kind',(item->>'date')::date,item->>'startTime',item->>'endTime',(item->>'durationMinutes')::integer,item->>'reason',item->>'minimumVersion'); n:=n+1;
   end if;
  end loop;
  r:=jsonb_build_object('created',n,'ids','[]'::jsonb);
 elsif operation='planning.updateStatus' then
  if payload->>'status' in ('in_progress','completed') then raise exception 'USE_FLOW_TIMER'; end if;
  if exists(select 1 from public.jr_sessions where user_id=u and block_id=(payload->>'id')::integer and status in ('running','paused')) then raise exception 'ACTIVE_FLOW'; end if;
  update public.jr_blocks set status=payload->>'status' where id=(payload->>'id')::integer and user_id=u returning id into rid;
 else raise exception 'INVALID_OPERATION';
 end if;
 if r is null then
  if rid is null then raise exception 'NOT_FOUND'; end if;
  r:=jsonb_build_object('id',rid,'success',true);
 end if;
 insert into public.jr_commands(user_id,request_id,operation,payload,result) values(u,request_id,operation,payload,r);
 return r;
end $$;
revoke all on function public.jr_study_mutate(text,jsonb,uuid,integer) from public,anon;
grant execute on function public.jr_study_mutate(text,jsonb,uuid,integer) to authenticated;
revoke all on function jr_private.touch_row() from public,anon;
grant execute on function jr_private.touch_row() to authenticated;

-- Authenticated subscriptions are additionally filtered by owner in the UI.
alter publication supabase_realtime add table public.jr_exams,public.jr_topics,public.jr_essays,public.jr_parts,public.jr_versions,public.jr_feedback,public.jr_blocks,public.jr_sessions,public.jr_periods;
notify pgrst, 'reload schema';
