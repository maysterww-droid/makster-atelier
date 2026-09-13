alter table public.quote_subscriptions drop constraint if exists quote_subscriptions_provider_check;
alter table public.quote_subscriptions add constraint quote_subscriptions_provider_check check (provider in ('lemonsqueezy','stripe','manual'));
