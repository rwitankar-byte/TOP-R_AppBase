alter table public.orders
add column if not exists order_type text not null default 'delivery';

alter table public.orders
drop constraint if exists orders_order_type_check;

alter table public.orders
add constraint orders_order_type_check
check (order_type in ('delivery', 'return'));
