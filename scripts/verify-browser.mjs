import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let record;
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Crear mi QR", exact: true })
    .waitFor();
  await page.locator(".preview-panel .qr-image svg").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".impeccable/screenshots/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/screenshots/mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile should not overflow",
  );
  await page.getByRole('button', { name: 'Redondeados', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.impeccable/screenshots/mobile-controls.png' });
  const sticky = await page.locator('.mobile-proof').boundingBox();
  assert.ok(sticky && sticky.y >= 0 && sticky.y < 100, 'Mobile live preview stays visible beside customization');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "Crear mi QR", exact: true }).click();
  await page.getByText("Dale un nombre al QR.", { exact: true }).waitFor();
  await page.getByLabel("Nombre del QR").fill("Prueba automática QR");
  await page
    .getByLabel("Enlace de destino", { exact: true })
    .fill("https://example.com/original");
  await page.getByRole("button", { name: "Redondeados", exact: true }).click();
  await page.getByRole("button", { name: "Suaves", exact: true }).click();
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/api/qrs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear mi QR", exact: true }).click();
  const response = await created;
  assert.equal(response.status(), 201);
  record = (await response.json()).record;
  const permanent = `${base}/r/${record.slug}`;
  await page.getByLabel("Enlace permanente del QR").waitFor();
  assert.equal(
    await page.getByLabel("Enlace permanente del QR").inputValue(),
    permanent,
  );
  await page.locator(".preview-panel .qr-image svg").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar QR", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(".impeccable/screenshots/generated-qr.png");
  const png = PNG.sync.read(
    await fs.readFile(".impeccable/screenshots/generated-qr.png"),
  );
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(
    decoded?.data,
    permanent,
    "Downloaded QR must decode to permanent URL",
  );
  const logo = new PNG({ width: 32, height: 32 });
  for (let i = 0; i < logo.data.length; i += 4) { logo.data[i] = 28; logo.data[i + 1] = 81; logo.data[i + 2] = 67; logo.data[i + 3] = 255; }
  await page.locator('input[type=file]').setInputFiles({ name: 'test-logo.png', mimeType: 'image/png', buffer: PNG.sync.write(logo) });
  await page.getByText('Logo agregado', { exact: true }).waitFor();
  const logoSaved = page.waitForResponse(r => r.url().endsWith(`/api/qrs/${record.id}`) && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  assert.equal((await logoSaved).status(), 200);
  const logoDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar QR', exact: true }).click();
  const logoDownload = await logoDownloadPromise;
  const logoPng = PNG.sync.read(await fs.readFile(await logoDownload.path()));
  assert.equal(jsQR(new Uint8ClampedArray(logoPng.data), logoPng.width, logoPng.height)?.data, permanent, 'QR with logo must remain readable');
  await page.getByLabel('Formato de descarga').selectOption('svg');
  const svgPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar QR', exact: true }).click();
  const svgDownload = await svgPromise;
  const svg = await fs.readFile(await svgDownload.path(), 'utf8');
  assert.match(svg, /<svg/); assert.match(svg, /<image/);
  let redirect = await context.request.get(permanent, { maxRedirects: 0 });
  assert.equal(redirect.status(), 302);
  assert.equal(redirect.headers().location, "https://example.com/original");
  assert.match(redirect.headers()["cache-control"], /no-store/);
  await page
    .getByLabel("Enlace de destino", { exact: true })
    .fill("https://example.com/changed");
  const updated = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/qrs/${record.id}`) &&
      r.request().method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  assert.equal((await updated).status(), 200);
  redirect = await context.request.get(permanent, { maxRedirects: 0 });
  assert.equal(redirect.headers().location, "https://example.com/changed");
  await page
    .getByRole("button", { name: "Pausar este QR", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reactivar este QR", exact: true })
    .waitFor();
  assert.equal(
    (await context.request.get(permanent, { maxRedirects: 0 })).status(),
    404,
  );
  await page
    .getByRole("button", { name: "Reactivar este QR", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pausar este QR", exact: true })
    .waitFor();
  assert.equal(
    (await context.request.head(permanent, { maxRedirects: 0 })).status(),
    302,
  );
  await page.getByRole("button", { name: /Mis códigos QR/ }).click();
  await page
    .getByRole("button", { name: "Prueba automática QR", exact: true })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: /Mis códigos QR/ }).click();
  await page
    .getByRole("button", { name: "Prueba automática QR", exact: true })
    .waitFor();
  await page.getByLabel("Buscar QR").fill("no-existe-abc");
  await page.getByText("No encontramos ese QR.").waitFor();
  await page.getByLabel("Buscar QR").fill("Prueba automática");
  await page.screenshot({
    path: ".impeccable/screenshots/library.png",
    fullPage: true,
  });
  const originRejected = await context.request.post(`${base}/api/qrs`, {
    headers: { Origin: "https://other.example" },
    data: {},
  });
  assert.equal(originRejected.status(), 403);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile, no overflow, form validation, create, PNG decode, direct redirect, destination edit, pause/reactivate, persistence, search, CSRF, no browser errors.",
  );
} finally {
  if (record)
    await context.request.delete(`${base}/api/qrs/${record.id}`, {
      headers: { Origin: base },
    });
  await browser.close();
}
