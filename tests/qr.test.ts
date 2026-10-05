import test from "node:test";
import assert from "node:assert/strict";
import {
  contrast,
  defaultDesign,
  qrInputSchema,
  slugPattern,
  validDestination,
} from "../lib/qr";
test("permits web destinations but rejects executable URLs and embedded credentials", () => {
  for (const value of [
    "https://example.com/a?q=1#section",
    "http://example.com",
    "https://wa.me/5491112345678",
  ])
    assert.equal(validDestination(value), true);
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://example.com",
    "/relative",
    "https://user:password@example.com",
    "not a url",
  ])
    assert.equal(validDestination(value), false);
});
test("validates QR contrast, bounded names and raster logos", () => {
  const valid = {
    name: " Carta ",
    destination: "https://example.com",
    active: true,
    design: defaultDesign,
  };
  assert.equal(qrInputSchema.parse(valid).name, "Carta");
  assert.ok(contrast("#173E36", "#FFFFFF") > 4.5);
  assert.equal(
    qrInputSchema.safeParse({
      ...valid,
      design: { ...defaultDesign, foreground: "#FFFFFF" },
    }).success,
    false,
  );
  assert.equal(
    qrInputSchema.safeParse({
      ...valid,
      design: { ...defaultDesign, logo: "data:image/svg+xml;base64,abcd" },
    }).success,
    false,
  );
  assert.equal(qrInputSchema.safeParse({ ...valid, name: "" }).success, false);
  assert.equal(
    qrInputSchema.safeParse({ ...valid, name: "x".repeat(81) }).success,
    false,
  );
  assert.equal(
    qrInputSchema.safeParse({
      ...valid,
      design: { ...defaultDesign, logo: "https://external.com/logo.png" },
    }).success,
    false,
  );
});
test("public redirects use opaque exact-length URL-safe identifiers", () => {
  assert.ok(slugPattern.test("Abcd1234_-xy"));
  for (const slug of ["short", "../admin", "x".repeat(13), "Abcd1234_ xy"])
    assert.equal(slugPattern.test(slug), false);
});
