-- Retry deduplication needs a fingerprint, not another copy of essay text.
-- Canonical essays, full versions and all Flow records are unaffected.
alter table public.jr_commands alter column payload type text
 using pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex');
alter table public.jr_commands rename column payload to payload_hash;
do $$
declare definition text; fingerprint text:='pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,''UTF8'')),''hex'')';
begin
 definition:=pg_get_functiondef('public.jr_study_mutate(text,jsonb,uuid,integer)'::regprocedure);
 if position('old_command.payload<>payload' in definition)=0
 or position('operation,payload,result) values(u,request_id,operation,payload,r)' in definition)=0 then
  raise exception 'Unexpected mutation function version; no changes committed';
 end if;
 definition:=replace(definition,'old_command.payload<>payload','old_command.payload_hash<>'||fingerprint);
 definition:=replace(definition,'operation,payload,result) values(u,request_id,operation,payload,r)',
 'operation,payload_hash,result) values(u,request_id,operation,'||fingerprint||',r)');
 execute definition;
end $$;
notify pgrst, 'reload schema';
