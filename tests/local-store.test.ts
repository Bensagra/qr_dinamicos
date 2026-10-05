import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("legacy local QR files migrate without changing slugs and concurrent updates persist", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "qr-local-test-"));
  try {
    await mkdir(path.join(dir, ".data"));
    await writeFile(path.join(dir, ".data/qrs.json"), JSON.stringify([{ id: "legacy", slug: "Abcd1234_-xy", scans: 3 }]));
    const source = `process.chdir(${JSON.stringify(dir)});
      const imported = await import(${JSON.stringify(new URL("../lib/local-store.ts", import.meta.url).href)});
      const { localStore } = imported.default ?? imported;
      await localStore((_records, venues) => venues.push({id:'venue',name:'Centro',created_at:'now'}), true);
      await Promise.all(Array.from({length:20},()=>localStore(records => records[0].scans++, true)));
      try { await localStore(records => { records.length=0; throw new Error('abort'); }, true); } catch {}`;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", source], { env: { ...process.env, NODE_ENV: "development", VERCEL: "" }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const stored = JSON.parse(await readFile(path.join(dir, ".data/qrs.json"), "utf8"));
    assert.equal(stored.records[0].slug, "Abcd1234_-xy");
    assert.equal(stored.records[0].scans, 23);
    assert.equal(stored.records[0].kind, "qr");
    assert.equal(stored.records[0].venue_id, null);
    assert.equal(stored.venues[0].name, "Centro");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
