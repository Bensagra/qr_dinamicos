-- QR codes without destination. Existing installations: run once after migration-menus.sql.
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
-- Venue NFC and menu links that still point to the old default URL and were never opened become empty.
update public.qr_codes set destination = null
  where destination = 'https://example.com/' and scans = 0 and venue_id is not null and kind in ('short', 'menu');
commit;
