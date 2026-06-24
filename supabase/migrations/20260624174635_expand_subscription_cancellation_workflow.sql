alter table public.subscriptions
add column if not exists cancel_requested_at timestamptz,
add column if not exists return_status text;

update public.subscriptions
set status = 'Cancellation Requested',
    return_status = 'Cancellation Requested',
    cancel_requested_at = coalesce(cancel_requested_at, now())
where status = 'Return Requested';

update public.subscriptions
set status = 'Return Pending',
    return_status = 'Return Pending',
    cancel_requested_at = coalesce(cancel_requested_at, now())
where status = 'Return Confirmed';

alter table public.orders
drop constraint if exists orders_type_check;

alter table public.orders
add constraint orders_type_check
check (type in ('regular', 'subscription', 'refill', 'return'));

alter table public.orders
drop constraint if exists orders_status_check;

alter table public.orders
add constraint orders_status_check
check (status in ('Placed', 'Confirmed', 'Out for Delivery', 'Delivered', 'Out for Return', 'Picked Up', 'Returned', 'Refund Completed', 'Cancelled'));

alter table public.subscriptions
drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
add constraint subscriptions_status_check
check (status in ('Pending', 'Active', 'Paused', 'Cancellation Requested', 'Return Pending', 'Picked Up', 'Returned', 'Refund Completed', 'Cancelled'));
