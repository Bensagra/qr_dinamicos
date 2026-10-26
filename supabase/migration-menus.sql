-- Menu photos and venue users. Existing installations: run once after migration-venues.sql.
begin;
alter table public.venues add column menu_pdf text;
-- Accounts invited to manage one venue's menu photos (and nothing else).
create table public.venue_members (
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);
create index venue_members_user_idx on public.venue_members(user_id);
create table public.menu_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position integer not null,
  created_at timestamptz not null default now()
);
create index menu_photos_venue_idx on public.menu_photos(venue_id, position);
-- Only the server (secret key) reads or writes these, after checking who is signed in.
alter table public.venue_members enable row level security;
alter table public.menu_photos enable row level security;
revoke all on public.venue_members, public.menu_photos from anon, authenticated;
-- Public files: the menu PDF is opened by anyone who scans the QR. Paths are random; listing is not allowed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menus', 'menus', true, 52428800, array['image/jpeg', 'application/pdf'])
on conflict (id) do nothing;
commit;
