drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile" on public.users for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Users can manage own addresses" on public.addresses;
create policy "Users can manage own addresses" on public.addresses for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can manage own orders" on public.orders;
create policy "Users can manage own orders" on public.orders for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid()))
);

drop policy if exists "Users can manage own subscriptions" on public.subscriptions;
create policy "Users can manage own subscriptions" on public.subscriptions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments" on public.payments for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions for select to authenticated using (user_id = (select auth.uid()));
