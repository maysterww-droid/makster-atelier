create index if not exists quote_client_access_links_quote_fk_idx on public.quote_client_access_links (quote_id);
create index if not exists quote_client_access_links_created_by_idx on public.quote_client_access_links (created_by) where created_by is not null;
create index if not exists quote_email_deliveries_quote_fk_idx on public.quote_email_deliveries (quote_id);
create index if not exists quote_email_deliveries_access_link_idx on public.quote_email_deliveries (access_link_id) where access_link_id is not null;
create index if not exists quote_email_deliveries_created_by_idx on public.quote_email_deliveries (created_by) where created_by is not null;
