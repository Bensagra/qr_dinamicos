import test from "node:test";
import assert from "node:assert/strict";
import { defaultDestination, isPlaceholder, qrInputSchema, venueDefaultLinks, type QRRecord } from "../lib/qr";

test("each venue starts with a valid NFC short link and menu pointing to the default URL", () => {
  const venue = { id: "3f1d2c4b-5a6e-4f70-8a9b-0c1d2e3f4a5b", name: "Café Centro", created_at: "now" };
  const links = venueDefaultLinks(venue);
  assert.deepEqual(links.map((l) => l.kind), ["short", "menu"]);
  for (const link of links) {
    assert.equal(link.venue_id, venue.id);
    assert.equal(link.destination, defaultDestination);
    assert.ok(qrInputSchema.safeParse(link).success);
    const record = { ...link, id: "x", slug: "Abcd1234_-xy", scans: 0, created_at: "", updated_at: "" } as QRRecord;
    assert.ok(isPlaceholder(record));
    assert.ok(!isPlaceholder({ ...record, destination: "https://carta.example/menu" }));
    assert.ok(!isPlaceholder({ ...record, scans: 1 }));
  }
  assert.ok(venueDefaultLinks({ ...venue, name: "x".repeat(80) }).every((l) => l.name.length <= 80));
});
