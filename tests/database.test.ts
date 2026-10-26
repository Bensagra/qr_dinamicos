import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("database policies isolate owners while public redirects remain immediate and count atomically", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
      create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated; set "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';`,
    );
    await db.query(
      `insert into public.qr_codes(slug,name,destination,design) values ($1,$2,$3,$4)`,
      ["Abcd1234_-xy", "Menu", "https://example.com/old", "{}"],
    );
    await db.exec(
      `set "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';`,
    );
    assert.equal(
      (await db.query("select * from public.qr_codes")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          `update public.qr_codes set destination='https://evil.example' returning id`,
        )
      ).rows.length,
      0,
    );
    await db.exec(`set role anon;`);
    await assert.rejects(
      db.query("select * from public.qr_codes"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query<{ resolve_qr: string }>(
          `select public.resolve_qr('Abcd1234_-xy')`,
        )
      ).rows[0].resolve_qr,
      "https://example.com/old",
    );
    await db.exec(
      `set role authenticated; set "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';`,
    );
    await assert.rejects(
      db.query(`update public.qr_codes set slug='Different_Id'`),
      /permission denied/,
    );
    await assert.rejects(
      db.query(`update public.qr_codes set scans=500`),
      /permission denied/,
    );
    await db.query(
      `update public.qr_codes set destination='https://example.com/new'`,
    );
    assert.equal(
      (
        await db.query<{ resolve_qr: string }>(
          `select public.resolve_qr('Abcd1234_-xy', false)`,
        )
      ).rows[0].resolve_qr,
      "https://example.com/new",
    );
    assert.equal(
      Number(
        (await db.query<{ scans: number }>("select scans from public.qr_codes"))
          .rows[0].scans,
      ),
      1,
    );
    await db.query("update public.qr_codes set active=false");
    assert.equal(
      (
        await db.query<{ resolve_qr: null }>(
          `select public.resolve_qr('Abcd1234_-xy')`,
        )
      ).rows[0].resolve_qr,
      null,
    );
    assert.equal(
      (
        await db.query<{ resolve_qr: null }>(
          `select public.resolve_qr('invalid')`,
        )
      ).rows[0].resolve_qr,
      null,
    );
    // Venue membership is enforced in SQL, including direct API access.
    const venueA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await db.exec(`reset role; insert into public.venues(id,owner_id,name) values ('${venueA}', '11111111-1111-4111-8111-111111111111', 'Centro'); set role authenticated;`);
    await db.exec(`set "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query("select * from public.venues")).rows.length, 0);
    await assert.rejects(db.query(`insert into public.qr_codes(slug,name,destination,design,venue_id) values ('Bbbb1234_-xy','Foreign','https://example.com','{}',$1)`, [venueA]), /foreign key/);
    await db.exec(`set "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';`);
    await db.query(`update public.qr_codes set venue_id=$1, kind='menu'`, [venueA]);
    await assert.rejects(db.query(`insert into public.qr_codes(slug,name,destination,design,venue_id,kind) values ('Cccc1234_-xy','Second menu','https://example.com','{}',$1,'menu')`, [venueA]), /unique/);
    await assert.rejects(db.query(`update public.qr_codes set venue_id=null`), /check constraint/);
    await assert.rejects(db.query(`delete from public.venues where id=$1`, [venueA]), /foreign key/);
    await db.query(`update public.venues set name='Centro nuevo' where id=$1`, [venueA]);
    await db.query(`update public.qr_codes set active=true`);
    // Menu photos and venue users are only reachable through the server's secret key.
    await db.exec(`reset role; insert into public.venue_members(venue_id,user_id,email) values ('${venueA}','22222222-2222-4222-8222-222222222222','staff@example.com');
      insert into public.menu_photos(venue_id,path,width,height,position) values ('${venueA}','${venueA}/photos/a.jpg',800,1200,0); set role authenticated;`);
    for (const user of ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"]) {
      await db.exec(`set "request.jwt.claim.sub" = '${user}';`);
      await assert.rejects(db.query("select * from public.menu_photos"), /permission denied/);
      await assert.rejects(db.query("select * from public.venue_members"), /permission denied/);
      await assert.rejects(db.query(`update public.venues set menu_pdf='x.pdf'`), /permission denied/);
    }
    await db.exec("reset role;");
    assert.equal((await db.query<{ public: boolean }>("select public from storage.buckets where id='menus'")).rows[0].public, true);
    // Empty QR: the scan reports '' (setup page) without counting; once its owner sets the destination it redirects and counts.
    await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';`);
    await db.query(`insert into public.qr_codes(slug,name,destination,design) values ('Empty1234_xy','Mesa 4',null,'{}')`);
    await db.exec(`set role anon;`);
    for (const count of [true, false])
      assert.equal((await db.query<{resolve_qr:string}>(`select public.resolve_qr('Empty1234_xy',${count})`)).rows[0].resolve_qr, "");
    await db.exec(`set role authenticated;`);
    assert.equal(Number((await db.query<{scans:number}>(`select scans from public.qr_codes where slug='Empty1234_xy'`)).rows[0].scans), 0);
    await assert.rejects(db.query(`update public.qr_codes set destination='javascript:alert(1)' where slug='Empty1234_xy'`), /check constraint/);
    assert.equal((await db.query(`update public.qr_codes set destination='https://example.com/mesa-4' where slug='Empty1234_xy' and destination is null returning id`)).rows.length, 1);
    assert.equal((await db.query(`update public.qr_codes set destination='https://evil.example' where slug='Empty1234_xy' and destination is null returning id`)).rows.length, 0);
    await db.exec(`set role anon;`);
    assert.equal((await db.query<{resolve_qr:string}>(`select public.resolve_qr('Empty1234_xy')`)).rows[0].resolve_qr, "https://example.com/mesa-4");
    await assert.rejects(db.query("select * from public.venues"), /permission denied/);
    await assert.rejects(db.query("select * from public.menu_photos"), /permission denied/);
    assert.equal((await db.query<{resolve_qr:string}>(`select public.resolve_qr('Abcd1234_-xy',false)`)).rows[0].resolve_qr, "https://example.com/new");
  } finally {
    await db.close();
  }
});
