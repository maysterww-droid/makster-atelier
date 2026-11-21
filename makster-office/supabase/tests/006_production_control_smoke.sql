-- Run after applying migrations 0.1 -> 0.8 on a Supabase test database.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public','production_approval_requests','approval requests exist');
select has_table('public','production_approval_decisions','approval decisions exist');
select has_table('public','machine_postprocessor_profiles','postprocessor registry exists');
select has_table('public','production_machines','machine registry exists');
select has_table('public','production_queue_jobs','production queue jobs exist');
select has_table('public','production_queue_events','production events exist');
select has_table('public','machine_output_artifacts','machine output artifacts exist');

select ok((select relrowsecurity from pg_class where oid='public.production_approval_requests'::regclass),'approval RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.production_queue_jobs'::regclass),'queue RLS enabled');
select ok(exists(select 1 from pgmq.list_queues() where queue_name='makster-production'),'durable pgmq queue exists');
select has_function('private','validate_production_enqueue',array[]::text[],'live enqueue gate exists');
select has_function('private','dispatch_production_queue_job',array[]::text[],'pgmq dispatch trigger function exists');

select * from finish();
rollback;
