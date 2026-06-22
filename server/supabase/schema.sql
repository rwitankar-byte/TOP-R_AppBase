create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  avatar_url text,
  push_token text,
  wallet_balance numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  full_address text not null,
  lat numeric(10, 7),
  lng numeric(10, 7),
  is_default boolean not null default false
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  price numeric(10, 2) not null,
  unit text not null,
  is_active boolean not null default true
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  address_id uuid references public.addresses(id) on delete set null,
  status text not null default 'Placed' check (status in ('Placed', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled')),
  order_type text not null default 'delivery' check (order_type in ('delivery', 'return', 'refill')),
  total_amount numeric(10, 2) not null,
  delivery_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id),
  address_id uuid references public.addresses(id) on delete set null,
  frequency text not null check (frequency in ('Daily', 'Weekly', 'Custom')),
  start_date date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Active', 'Paused', 'Cancelled')),
  quantity integer not null default 1 check (quantity > 0),
  jar_count integer not null default 1 check (jar_count > 0),
  jar_deposit numeric(10, 2) not null default 250,
  water_charge_per_delivery numeric(10, 2) not null default 40,
  deposit_refunded boolean not null default false
);

alter table public.orders
add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique references public.products(id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  last_updated timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10, 2) not null,
  method text not null,
  status text not null default 'Paid' check (status in ('Pending', 'Paid', 'Failed', 'Refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  amount numeric(10, 2) not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.inventory enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;

create policy "Products are viewable by everyone" on public.products for select using (is_active = true);
create policy "Inventory is viewable by authenticated users" on public.inventory for select to authenticated using (true);

create policy "Users can view own profile" on public.users for select to authenticated using (id = auth.uid());
create policy "Users can update own profile" on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users can manage own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage own orders" on public.orders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can view own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Users can manage own subscriptions" on public.subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can view own payments" on public.payments for select to authenticated using (user_id = auth.uid());
create policy "Users can view own transactions" on public.transactions for select to authenticated using (user_id = auth.uid());
