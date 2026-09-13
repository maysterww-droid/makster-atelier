revoke execute on function public.quote_create_client_access_link(uuid,text,text,text,timestamptz) from anon;
revoke execute on function public.quote_revoke_client_access_link(uuid) from anon;
revoke execute on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) from anon;

grant execute on function public.quote_create_client_access_link(uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.quote_revoke_client_access_link(uuid) to authenticated;
grant execute on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) to authenticated;

revoke execute on function public.quote_public_snapshot(text) from public;
revoke execute on function public.quote_public_respond(text,text,text) from public;
grant execute on function public.quote_public_snapshot(text) to anon, authenticated;
grant execute on function public.quote_public_respond(text,text,text) to anon, authenticated;
