-- Remove retired feature commands without deleting Flow contexts or history.
-- Preserve the original applied migrations; change current behavior forward.
do $$
declare definition text; first_branch integer; final_else integer; input_guard text;
begin
 definition:=pg_get_functiondef('public.jr_study_mutate(text,jsonb,uuid,integer)'::regprocedure);
 first_branch:=strpos(definition,' elsif operation=''planning.generate'' then');
 final_else:=strpos(definition,' else raise exception ''INVALID_OPERATION'';');
 input_guard:=' if request_id is null or jsonb_typeof(payload)<>''object'' then raise exception ''INVALID_INPUT''; end if;';
 if first_branch=0 or final_else<=first_branch or strpos(definition,input_guard)=0 then
  raise exception 'Unexpected mutation function version; no changes committed';
 end if;
 definition:=left(definition,first_branch-1)||substr(definition,final_else);
 -- Reject removed commands BEFORE consulting the idempotency journal so even
 -- replays of old request IDs cannot report a retired action as successful.
 definition:=replace(definition,input_guard,input_guard||'
 if operation not in (
 ''exams.create'',''exams.update'',''exams.close'',''exams.delete'',
 ''exams.createTopic'',''exams.updateTopic'',''exams.deleteTopic'',
 ''essays.create'',''essays.save'',''essays.autosave'',''essays.restoreVersion'',
 ''essays.applyPart'',''essays.delete'',''essays.createPart'',''essays.updatePart'',
 ''essays.deletePart'',''essays.reorderParts'',''essays.feedback'',
 ''flows.createAdHoc'',''flows.start'',''flows.pause'',''flows.resume'',''flows.complete'',''flows.cancel''
 ) then raise exception ''INVALID_OPERATION''; end if;');
 execute definition;
end $$;
-- This placeholder never backed a cloud library; Flow owner foreign keys,
-- sessions, periods and timers remain untouched.
alter table public.jr_blocks drop column resource_id;
notify pgrst, 'reload schema';
