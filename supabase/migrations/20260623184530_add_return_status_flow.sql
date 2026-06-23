alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check
check (status in ('Placed', 'Confirmed', 'Out for Delivery', 'Delivered', 'Out for Return', 'Picked Up', 'Cancelled'));

alter table public.subscriptions
drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
add constraint subscriptions_status_check
check (status in ('Pending', 'Active', 'Paused', 'Return Requested', 'Return Confirmed', 'Cancelled'));
