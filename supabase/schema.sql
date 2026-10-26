-- Run once in Supabase SQL Editor. Authentication is managed by Supabase Auth.
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[A-Za-z0-9_-]{12}$'),
  name text not null check (length(name) between 1 and 80),
  destination text not null check (length(destination) <= 2048 and destination ~ '^https?://[^[:space:]]+$'),
  design jsonb not null,
  active boolean not null default true,
  scans bigint not null default 0 check (scans >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index qr_codes_owner_idx on public.qr_codes(owner_id);
alter table public.qr_codes enable row level security;
revoke all on public.qr_codes from anon, authenticated;
grant select, delete on public.qr_codes to authenticated;
grant insert (slug, name, destination, design, active) on public.qr_codes to authenticated;
grant update (name, destination, design, active, updated_at) on public.qr_codes to authenticated;
create policy "Owner manages own QR codes" on public.qr_codes for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Public scans resolve one opaque slug; no public access to the management table.
-- Count measures requests, including repeat visits/bots, not unique people.
create or replace function public.resolve_qr(qr_slug text, count_visit boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare target text;
begin
  if qr_slug !~ '^[A-Za-z0-9_-]{12}$' then return null; end if;
  if count_visit then
    update public.qr_codes set scans = scans + 1
      where slug = qr_slug and active = true returning destination into target;
  else
    select destination into target from public.qr_codes where slug = qr_slug and active = true;
  end if;
  return target;
end;
$$;
revoke all on function public.resolve_qr(text, boolean) from public;
grant execute on function public.resolve_qr(text, boolean) to anon, authenticated;

-- Locales and link types (included for fresh installations).
begin;
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
alter table public.venues enable row level security;
revoke all on public.venues from anon, authenticated;
grant select, delete on public.venues to authenticated;
grant insert (name) on public.venues to authenticated;
grant update (name) on public.venues to authenticated;
create policy "Owner manages own venues" on public.venues for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
alter table public.qr_codes
  add column venue_id uuid,
  add column kind text not null default 'qr' check (kind in ('qr', 'short', 'menu')),
  add constraint menu_needs_venue check (kind <> 'menu' or venue_id is not null),
  add constraint qr_venue_owner foreign key (venue_id, owner_id) references public.venues(id, owner_id) on delete restrict;
create index qr_codes_venue_idx on public.qr_codes(venue_id);
create unique index qr_codes_one_menu_per_venue on public.qr_codes(venue_id) where kind = 'menu';
grant insert (venue_id, kind) on public.qr_codes to authenticated;
grant update (venue_id, kind) on public.qr_codes to authenticated;
commit;

-- Menu photos and venue users (included for fresh installations).
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

-- QR codes without destination (included for fresh installations).
begin;
-- Null: the owner chooses the destination the first time the QR is scanned.
alter table public.qr_codes alter column destination drop not null;
-- Returns '' for an empty QR (without counting the visit) so the scan opens its setup page.
create or replace function public.resolve_qr(qr_slug text, count_visit boolean default true)
returns text language plpgsql security definer set search_path = '' as $$
declare target text;
begin
  if qr_slug !~ '^[A-Za-z0-9_-]{12}$' then return null; end if;
  if count_visit then
    update public.qr_codes set scans = scans + 1
      where slug = qr_slug and active = true and destination is not null returning destination into target;
    if found then return target; end if;
  end if;
  select coalesce(destination, '') into target from public.qr_codes where slug = qr_slug and active = true;
  return target;
end;
$$;
commit;
