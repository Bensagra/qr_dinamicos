import test from "node:test";
import assert from "node:assert/strict";
import { writeNFC, nfcSupport } from "../lib/nfc";
const url = "https://qr.example/r/Abcd1234_-xy";
const root = globalThis as unknown as { window: Window };
test("NFC writes a URL record, protects existing content and only locks after writing", async () => {
  const calls: string[] = [];
  root.window = { isSecureContext: true, NDEFReader: class {
    async write(message: unknown, options: { overwrite?: boolean }) {
      assert.deepEqual(message, { records: [{ recordType: "url", data: url }] });
      assert.equal(options.overwrite, false); calls.push("write");
    }
    async makeReadOnly() { calls.push("lock"); }
  } } as unknown as Window;
  assert.equal(nfcSupport(), "android");
  assert.deepEqual(await writeNFC(url, true, false, new AbortController().signal, () => calls.push("written")), { written: true, locked: true });
  assert.deepEqual(calls, ["write", "written", "lock"]);
});
test("failed writing never locks; failed locking reports a partial success", async () => {
  let locked = false;
  root.window = { NDEFReader: class {
    async write() { throw new Error("write failed"); }
    async makeReadOnly() { locked = true; }
  } } as unknown as Window;
  await assert.rejects(writeNFC(url, true, false, new AbortController().signal, () => {}));
  assert.equal(locked, false);
  root.window = { NDEFReader: class {
    async write() {}
    async makeReadOnly() { throw new Error("lock failed"); }
  } } as unknown as Window;
  const result = await writeNFC(url, true, false, new AbortController().signal, () => {});
  assert.equal(result.written, true); assert.equal(result.locked, false); assert.ok(result.warning);
});
test("iOS uses the native bridge and propagates cancellation", async () => {
  const calls: unknown[] = [];
  let complete: (value: { written: boolean; locked: boolean }) => void = () => {};
  root.window = { webkit: { messageHandlers: { qrNFC: { postMessage: (message: { action: string }) => {
    calls.push(message);
    if (message.action === "cancel") return Promise.resolve({ written: false, locked: false });
    return new Promise(resolve => { complete = resolve; });
  } } } } } as unknown as Window;
  assert.equal(nfcSupport(), "ios");
  const abort = new AbortController();
  const writing = writeNFC(url, true, true, abort.signal, () => {});
  abort.abort(); complete({ written: true, locked: false });
  await writing;
  assert.deepEqual(calls, [{ action: "write", url, lock: true, overwrite: true }, { action: "cancel" }]);
});
