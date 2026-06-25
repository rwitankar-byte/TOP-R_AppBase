alter table public.addresses
add column if not exists landmark text,
add column if not exists area text,
add column if not exists city text,
add column if not exists pincode text;
