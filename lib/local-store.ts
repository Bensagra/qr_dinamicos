import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QRRecord, Venue } from "./qr";

// Development only. Serialized mutations and atomic replacement prevent lost updates.
const localPath = path.join(process.cwd(), ".data", "qrs.json");
const globalStore = globalThis as typeof globalThis & {
  qrQueue?: Promise<unknown>;
};
export async function localStore<T>(
  action: (records: QRRecord[], venues: Venue[]) => T,
  mutate = false,
): Promise<T> {
  const run = (globalStore.qrQueue ?? Promise.resolve()).then(async () => {
    if (process.env.NODE_ENV !== "development" || process.env.VERCEL)
      throw new Error("Local storage is development-only.");
    let records: QRRecord[] = [];
    let venues: Venue[] = [];
    try {
      const stored = JSON.parse(await readFile(localPath, "utf8"));
      records = (Array.isArray(stored) ? stored : stored.records).map((record: QRRecord) => ({ ...record, venue_id: record.venue_id ?? null, kind: record.kind ?? "qr" }));
      venues = Array.isArray(stored) ? [] : stored.venues;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const result = action(records, venues);
    if (mutate) {
      await mkdir(path.dirname(localPath), { recursive: true });
      await writeFile(`${localPath}.tmp`, JSON.stringify({ records, venues }, null, 2));
      await rename(`${localPath}.tmp`, localPath);
    }
    return result;
  });
  globalStore.qrQueue = run.catch(() => undefined);
  return run;
}
