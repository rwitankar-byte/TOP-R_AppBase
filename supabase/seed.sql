insert into public.products (id, name, description, image_url, price, unit, is_active)
values
  ('20l-ro-jar', '20L RO Purified Jar', 'Family pack purified RO water jar with sealed cap.', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=900&auto=format&fit=crop', 80, '20L Jar', true),
  ('10l-ro-jar', '10L RO Purified Jar', 'Compact jar for smaller homes and offices.', 'https://images.unsplash.com/photo-1606168094336-48f205e1fc27?q=80&w=900&auto=format&fit=crop', 55, '10L Jar', true),
  ('1l-bottle-pack', '1L Bottle Pack', 'Pack of 12 mineral-balanced RO bottles.', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=900&auto=format&fit=crop', 180, '12 x 1L', true),
  ('jar-stand', 'Jar Stand', 'Durable stand for 20L water jars.', 'https://images.unsplash.com/photo-1559839914-17aae19cec71?q=80&w=900&auto=format&fit=crop', 249, 'Piece', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price = excluded.price,
  unit = excluded.unit,
  is_active = excluded.is_active;

insert into public.inventory (product_id, quantity_available)
values
  ('20l-ro-jar', 350),
  ('10l-ro-jar', 160),
  ('1l-bottle-pack', 90),
  ('jar-stand', 40)
on conflict (product_id) do update set
  quantity_available = excluded.quantity_available,
  last_updated = now();
