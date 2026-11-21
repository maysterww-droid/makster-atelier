
-- Makster AI 4.1.0 — Owner Operations
-- PREPARED MIGRATION. Apply to staging first.
-- Organization-level warehouse, hard reservations, supplier intelligence,
-- supplier quotes, cash calendar and break-even fixed costs.

begin;

create table if not exists public.owner_warehouse_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  name text not null,
  manufacturer text,
  unit text not null check (unit in ('pcs','set','m2','m','mm','service')),
  on_hand numeric(16,3) not null default 0 check (on_hand >= 0),
  min_stock numeric(16,3),
  unit_cost_minor bigint,
  currency text not null check (char_length(currency)=3),
  location text,
  updated_at timestamptz not null default now(),
  unique(organization_id, sku)
);

create table if not exists public.owner_warehouse_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.owner_warehouse_items(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  quantity numeric(16,3) not null check (quantity > 0),
  priority integer not null default 100,
  status text not null default 'reserved' check (status in ('reserved','consumed','released')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists owner_warehouse_res_item_idx
  on public.owner_warehouse_reservations(organization_id,item_id,status,priority,created_at);
create index if not exists owner_warehouse_res_project_idx
  on public.owner_warehouse_reservations(organization_id,project_id,status);

create table if not exists public.owner_supplier_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  currency text not null check (char_length(currency)=3),
  lead_time_days numeric(8,2) not null default 7 check (lead_time_days >= 0),
  reliability_pct numeric(6,2) not null default 90 check (reliability_pct between 0 and 100),
  defect_pct numeric(6,2) not null default 0 check (defect_pct between 0 and 100),
  payment_terms_days integer not null default 0 check (payment_terms_days >= 0),
  price_index numeric(8,2) not null default 100 check (price_index > 0),
  active boolean not null default true,
  categories text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.owner_supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.owner_supplier_profiles(id) on delete cascade,
  reference text,
  currency text not null check (char_length(currency)=3),
  lines_json jsonb not null default '[]'::jsonb check (jsonb_typeof(lines_json)='array'),
  lead_time_days numeric(8,2) not null check (lead_time_days >= 0),
  valid_until timestamptz,
  delivery_cost_minor bigint,
  created_at timestamptz not null default now()
);
create index if not exists owner_supplier_quotes_supplier_idx
  on public.owner_supplier_quotes(organization_id,supplier_id,created_at desc);

create table if not exists public.owner_cash_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in ('inflow','outflow')),
  category text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency)=3),
  due_at timestamptz not null,
  status text not null check (status in ('planned','committed','paid','received','cancelled')),
  project_id uuid references public.projects(id) on delete set null,
  counterparty text,
  note text
);
create index if not exists owner_cash_events_due_idx
  on public.owner_cash_events(organization_id,currency,due_at,status);

create table if not exists public.owner_fixed_monthly_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency)=3)
);

-- Atomic hard reservation. Locks the warehouse item row so parallel users cannot
-- reserve the same free stock simultaneously.
create or replace function public.owner_reserve_warehouse_stock(
  p_organization_id uuid,
  p_item_id uuid,
  p_project_id uuid,
  p_quantity numeric,
  p_priority integer default 100,
  p_note text default null
)
returns public.owner_warehouse_reservations
language plpgsql
security definer
set search_path=''
as $$
declare
  v_item public.owner_warehouse_items;
  v_reserved numeric;
  v_result public.owner_warehouse_reservations;
begin
  if p_quantity <= 0 then raise exception 'warehouse_reservation_quantity_invalid'; end if;

  select * into v_item from public.owner_warehouse_items
  where id=p_item_id and organization_id=p_organization_id
  for update;
  if not found then raise exception 'warehouse_item_not_found'; end if;

  select coalesce(sum(quantity),0) into v_reserved
  from public.owner_warehouse_reservations
  where organization_id=p_organization_id and item_id=p_item_id and status='reserved';

  if v_reserved+p_quantity > v_item.on_hand then
    raise exception 'warehouse_insufficient_available_stock';
  end if;

  insert into public.owner_warehouse_reservations(
    organization_id,item_id,project_id,quantity,priority,status,note
  ) values (
    p_organization_id,p_item_id,p_project_id,p_quantity,coalesce(p_priority,100),'reserved',p_note
  ) returning * into v_result;
  return v_result;
end $$;

create or replace function public.owner_adjust_warehouse_stock(
  p_organization_id uuid,p_item_id uuid,p_delta numeric
)
returns public.owner_warehouse_items
language plpgsql security definer set search_path=''
as $$
declare
  v_item public.owner_warehouse_items;
  v_reserved numeric;
  v_next numeric;
begin
  if p_delta=0 then raise exception 'warehouse_adjustment_invalid'; end if;
  select * into v_item from public.owner_warehouse_items
    where id=p_item_id and organization_id=p_organization_id for update;
  if not found then raise exception 'warehouse_item_not_found'; end if;
  select coalesce(sum(quantity),0) into v_reserved from public.owner_warehouse_reservations
    where organization_id=p_organization_id and item_id=p_item_id and status='reserved';
  v_next:=v_item.on_hand+p_delta;
  if v_next < v_reserved then raise exception 'warehouse_adjustment_would_consume_reserved_stock'; end if;
  if v_next < 0 then raise exception 'warehouse_negative_stock'; end if;
  update public.owner_warehouse_items set on_hand=v_next,updated_at=now()
    where id=p_item_id returning * into v_item;
  return v_item;
end $$;

create or replace function public.owner_set_reservation_status(
  p_organization_id uuid,p_reservation_id uuid,p_status text
)
returns public.owner_warehouse_reservations
language plpgsql security definer set search_path=''
as $$
declare
  v_res public.owner_warehouse_reservations;
  v_item public.owner_warehouse_items;
begin
  if p_status not in ('consumed','released') then raise exception 'warehouse_reservation_status_invalid'; end if;
  select * into v_res from public.owner_warehouse_reservations
    where id=p_reservation_id and organization_id=p_organization_id for update;
  if not found then raise exception 'warehouse_reservation_not_found'; end if;
  if v_res.status <> 'reserved' then raise exception 'warehouse_reservation_not_active'; end if;

  if p_status='consumed' then
    select * into v_item from public.owner_warehouse_items
      where id=v_res.item_id and organization_id=p_organization_id for update;
    if v_item.on_hand < v_res.quantity then raise exception 'warehouse_negative_stock'; end if;
    update public.owner_warehouse_items set on_hand=on_hand-v_res.quantity,updated_at=now()
      where id=v_res.item_id;
  end if;

  update public.owner_warehouse_reservations set status=p_status
    where id=p_reservation_id returning * into v_res;
  return v_res;
end $$;

alter table public.owner_warehouse_items enable row level security;
alter table public.owner_warehouse_reservations enable row level security;
alter table public.owner_supplier_profiles enable row level security;
alter table public.owner_supplier_quotes enable row level security;
alter table public.owner_cash_events enable row level security;
alter table public.owner_fixed_monthly_costs enable row level security;

-- Owner/admin are the intended users of company-level financial and stock data.
create policy owner_warehouse_items_select on public.owner_warehouse_items for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_warehouse_reservations_select on public.owner_warehouse_reservations for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_supplier_profiles_select on public.owner_supplier_profiles for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_supplier_quotes_select on public.owner_supplier_quotes for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_cash_events_select on public.owner_cash_events for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_fixed_monthly_costs_select on public.owner_fixed_monthly_costs for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table
  public.owner_warehouse_items,public.owner_warehouse_reservations,
  public.owner_supplier_profiles,public.owner_supplier_quotes,
  public.owner_cash_events,public.owner_fixed_monthly_costs
from anon,authenticated;

grant select on table
  public.owner_warehouse_items,public.owner_warehouse_reservations,
  public.owner_supplier_profiles,public.owner_supplier_quotes,
  public.owner_cash_events,public.owner_fixed_monthly_costs
to authenticated;

grant select,insert,update,delete on table
  public.owner_warehouse_items,public.owner_warehouse_reservations,
  public.owner_supplier_profiles,public.owner_supplier_quotes,
  public.owner_cash_events,public.owner_fixed_monthly_costs
to service_role;

revoke all on function public.owner_reserve_warehouse_stock(uuid,uuid,uuid,numeric,integer,text) from public,anon,authenticated;
revoke all on function public.owner_adjust_warehouse_stock(uuid,uuid,numeric) from public,anon,authenticated;
revoke all on function public.owner_set_reservation_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.owner_reserve_warehouse_stock(uuid,uuid,uuid,numeric,integer,text) to service_role;
grant execute on function public.owner_adjust_warehouse_stock(uuid,uuid,numeric) to service_role;
grant execute on function public.owner_set_reservation_status(uuid,uuid,text) to service_role;

commit;
