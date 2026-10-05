import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("venue migration preserves existing QR redirects and history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111');`);
    const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");
    await db.exec(schema.split("-- Locales and link types")[0]);
    await db.exec(`insert into public.qr_codes(owner_id,slug,name,destination,design,scans) values ('11111111-1111-4111-8111-111111111111','Abcd1234_-xy','Existing','https://example.com/legacy','{}',42)`);
    await db.exec(await readFile(new URL("../supabase/migration-venues.sql", import.meta.url), "utf8"));
    const result = (await db.query<{kind:string;venue_id:null;scans:number}>("select kind,venue_id,scans from public.qr_codes")).rows[0];
    assert.equal(result.kind,"qr"); assert.equal(result.venue_id,null); assert.equal(Number(result.scans),42);
    assert.equal((await db.query<{resolve_qr:string}>("select public.resolve_qr('Abcd1234_-xy',false)")).rows[0].resolve_qr,"https://example.com/legacy");
  } finally { await db.close(); }
});
