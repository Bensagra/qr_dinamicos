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
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
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
    await db.exec(`set role anon;`);
    await assert.rejects(db.query("select * from public.venues"), /permission denied/);
    assert.equal((await db.query<{resolve_qr:string}>(`select public.resolve_qr('Abcd1234_-xy',false)`)).rows[0].resolve_qr, "https://example.com/new");
  } finally {
    await db.close();
  }
});
