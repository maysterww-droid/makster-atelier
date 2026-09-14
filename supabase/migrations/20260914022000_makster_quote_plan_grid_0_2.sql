-- Makster Quote 0.2 canonical plan grid.
-- Founder/Pro remain temporarily accepted only so an already-running sandbox
-- subscription can finish its lifecycle without violating the constraint.

alter table public.quote_subscriptions
  drop constraint if exists quote_subscriptions_plan_check;

alter table public.quote_subscriptions
  add constraint quote_subscriptions_plan_check
  check (plan in ('free','starter','workshop','atelier','founder','pro'));

comment on column public.quote_subscriptions.plan is
  'Canonical plans: free, starter, workshop, atelier. founder/pro are legacy sandbox compatibility values only.';
