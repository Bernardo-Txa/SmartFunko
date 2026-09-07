insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'home-banners',
  'home-banners',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "home_banners_storage_public_read" on storage.objects;
create policy "home_banners_storage_public_read"
on storage.objects
for select
to public
using (bucket_id = 'home-banners');

drop policy if exists "home_banners_storage_admin_insert" on storage.objects;
create policy "home_banners_storage_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'home-banners'
  and public.is_admin()
);

drop policy if exists "home_banners_storage_admin_update" on storage.objects;
create policy "home_banners_storage_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'home-banners'
  and public.is_admin()
)
with check (
  bucket_id = 'home-banners'
  and public.is_admin()
);

drop policy if exists "home_banners_storage_admin_delete" on storage.objects;
create policy "home_banners_storage_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'home-banners'
  and public.is_admin()
);
