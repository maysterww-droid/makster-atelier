-- Makster 1.5 Procurement Inbox smoke test (run after migrations on a disposable database)
select column_name from information_schema.columns where table_schema='public' and table_name='gmail_sync_cursors' and column_name='last_watch_renew_at';
select table_name from information_schema.tables where table_schema='public' and table_name in ('procurement_inbox_dispositions','owner_notifications','connection_operations_runs') order by table_name;
