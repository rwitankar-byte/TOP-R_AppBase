alter table public.subscriptions
add column if not exists jar_count integer not null default 1,
add column if not exists jar_deposit numeric(10,2) not null default 250,
add column if not exists water_charge_per_delivery numeric(10,2) not null default 40,
add column if not exists deposit_refunded boolean not null default false;
