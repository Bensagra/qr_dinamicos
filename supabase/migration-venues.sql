-- Existing installations: run once after the original schema.sql.
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
