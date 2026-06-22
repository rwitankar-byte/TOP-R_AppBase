alter table public.orders
add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

alter table public.orders
drop constraint if exists orders_order_type_check;

alter table public.orders
add constraint orders_order_type_check
check (order_type in ('delivery', 'return', 'refill'));

create index if not exists orders_subscription_id_idx on public.orders(subscription_id);
