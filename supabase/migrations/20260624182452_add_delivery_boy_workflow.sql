create table if not exists public.delivery_boys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders
add column if not exists delivery_boy_id uuid references public.delivery_boys(id) on delete set null,
add column if not exists assigned_at timestamptz,
add column if not exists picked_up_at timestamptz,
add column if not exists delivered_at timestamptz;

create table if not exists public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_boy_id uuid not null references public.delivery_boys(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  status text not null default 'Assigned',
  notes text
);

create index if not exists order_assignments_order_id_idx on public.order_assignments(order_id);
create index if not exists order_assignments_delivery_boy_id_idx on public.order_assignments(delivery_boy_id);
create index if not exists orders_delivery_boy_id_idx on public.orders(delivery_boy_id);

alter table public.delivery_boys enable row level security;
alter table public.order_assignments enable row level security;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
check (status in ('Placed', 'Confirmed', 'Assigned', 'Out for Delivery', 'Delivered', 'Out for Return', 'Picked Up', 'Returned', 'Refund Completed', 'Cancelled'));
