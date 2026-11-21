begin;
select plan(13);

select has_table('public','production_worker_runs','production_worker_runs exists');
select has_column('public','production_queue_jobs','machine_profile_sha256','queue freezes machine profile hash');
select has_column('public','production_queue_jobs','postprocessor_artifact_sha256','queue freezes postprocessor artifact hash');
select has_column('public','production_queue_jobs','lease_token','worker lease token exists');
select has_column('public','production_queue_jobs','lease_expires_at','worker lease expiry exists');
select has_column('public','production_queue_jobs','max_attempts','worker max attempts exists');
select has_column('public','machine_output_artifacts','machine_package_sha256','machine outputs carry package hash');
select has_function('public','production_worker_claim',array['text','integer'],'claim RPC exists');
select has_function('public','production_worker_heartbeat',array['uuid','text','uuid','integer'],'heartbeat RPC exists');
select has_function('public','production_worker_retry',array['uuid','text','uuid','text','text','integer'],'retry RPC exists');
select has_function('public','production_worker_complete',array['uuid','text','uuid','jsonb'],'complete RPC exists');
select has_function('public','production_worker_fail_terminal',array['uuid','text','uuid','text','text'],'terminal failure RPC exists');
select tests.rls_enabled('public','production_worker_runs');

select * from finish();
rollback;
