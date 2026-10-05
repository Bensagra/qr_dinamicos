export type NativeNFCResult = { written: boolean; locked: boolean; warning?: string };
type NFCOptions = { signal: AbortSignal; overwrite?: boolean };
export interface NFCReader {
  write(message: { records: { recordType: "url"; data: string }[] }, options: NFCOptions): Promise<void>;
  makeReadOnly?: (options: NFCOptions) => Promise<void>;
}
declare global {
  interface Window {
    NDEFReader?: { new(): NFCReader; prototype: NFCReader };
    webkit?: { messageHandlers?: { qrNFC?: { postMessage: (message: { action: string; url?: string; lock?: boolean; overwrite?: boolean }) => Promise<NativeNFCResult> } } };
  }
}
export function nfcSupport(): "ios" | "android" | "none" {
  if (typeof window === "undefined") return "none";
  if (window.webkit?.messageHandlers?.qrNFC) return "ios";
  return window.isSecureContext && window.NDEFReader ? "android" : "none";
}
export async function writeNFC(url: string, lock: boolean, overwrite: boolean, signal: AbortSignal, onWritten: () => void): Promise<NativeNFCResult> {
  signal.throwIfAborted();
  const bridge = window.webkit?.messageHandlers?.qrNFC;
  if (bridge) {
    const cancel = () => { void bridge.postMessage({ action: "cancel" }).catch(() => undefined); };
    signal.addEventListener("abort", cancel, { once: true });
    try { return await bridge.postMessage({ action: "write", url, lock, overwrite }); }
    finally { signal.removeEventListener("abort", cancel); }
  }
  if (!window.NDEFReader) throw new Error("Abrí el panel en Chrome para Android o en la app QR Studio para iPhone.");
  const reader = new window.NDEFReader();
  if (lock && !reader.makeReadOnly) throw new Error("Este navegador no permite bloquear etiquetas. Actualizá Chrome.");
  await reader.write({ records: [{ recordType: "url", data: url }] }, { signal, overwrite });
  onWritten();
  if (lock) {
    try { await reader.makeReadOnly!({ signal }); }
    catch { return { written: true, locked: false, warning: "El enlace se grabó, pero no se confirmó el bloqueo. Verificá la etiqueta antes de volver a intentar." }; }
  }
  return { written: true, locked: lock };
}
export function nfcError(error: unknown) {
  if (typeof error === "string") return error;
  const e = error as Error;
  if (e.name === "AbortError") return "Operación cancelada o tiempo de espera agotado. Volvé a acercar la etiqueta para intentar de nuevo.";
  if (e.name === "NotAllowedError" || e.name === "SecurityError") return "Permití el acceso a NFC y mantené el panel abierto en primer plano.";
  if (e.name === "NotSupportedError") return "El teléfono o la etiqueta no es compatible con NFC NDEF.";
  if (e.name === "NotReadableError") return "Activá NFC en tu teléfono y acercá una sola etiqueta compatible.";
  if (e.name === "NetworkError") return "No se pudo grabar. La etiqueta puede estar bloqueada, ocupada o no tener espacio suficiente.";
  return e.message || "No se pudo completar la operación NFC. Revisá la etiqueta y volvé a intentar.";
}
