"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LockKeyhole, Smartphone, X } from "lucide-react";
import { nfcError, nfcSupport, writeNFC } from "@/lib/nfc";
const subscribe = () => () => {};
export function NFCPanel({ url, disabled, local }: { url: string; disabled: boolean; local: boolean }) {
  const support = useSyncExternalStore(subscribe, nfcSupport, () => "none" as const);
  const [lock, setLock] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function write() {
    if (controller.current || disabled || local) return;
    if (lock && support !== "ios" && !window.confirm("Vas a grabar este enlace y bloquear permanentemente la etiqueta. No se podrá volver a escribir. Podrás seguir cambiando el destino desde el panel. Mantené la misma etiqueta junto al teléfono durante todo el proceso. ¿Continuar?")) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setStatus("Acercá una sola etiqueta NFC y mantenela junto al teléfono.");
    const timer = setTimeout(() => abort.abort(), 60000);
    try {
      const result = await writeNFC(url, lock, overwrite, abort.signal, () => setStatus(lock ? "Enlace grabado. No retires ni cambies la etiqueta: bloqueando…" : "Enlace grabado."));
      setStatus(result.warning || (result.locked ? "Etiqueta grabada y bloqueada permanentemente. El destino sigue siendo editable en el panel." : "Etiqueta grabada. Probala acercando el teléfono."));
    } catch (error) { setStatus(nfcError(error)); }
    finally { clearTimeout(timer); controller.current = null; setBusy(false); }
  }
  return <section className="nfc-panel" aria-label="Grabar NFC">
    <h2><Smartphone size={18} /> Tu enlace en una etiqueta NFC</h2>
    <p>El QR y el NFC comparten esta URL corta. Si pausás el enlace, ambos dejan de redirigir.</p>
    {support === "none" ? <p>Abrí este panel en la <strong>app QR Studio para iPhone</strong> o en <strong>Chrome para Android con NFC</strong> para grabar y bloquear. Safari no permite grabar NFC. También podés copiar el enlace a una app de grabación NFC.</p> : <>
      <p>{support === "ios" ? "Grabación nativa de iPhone" : "Grabación desde Chrome para Android"} · Etiquetas NDEF compatibles.</p>
      <label className="check-field"><input type="checkbox" checked={overwrite} disabled={busy} onChange={e => setOverwrite(e.target.checked)} /> Reemplazar el contenido actual de la etiqueta</label>
      <label className="check-field"><input type="checkbox" checked={lock} disabled={busy} onChange={e => setLock(e.target.checked)} /> Bloquear contra reescritura después de grabar</label>
      {lock && <p className="nfc-warning"><LockKeyhole size={15} /> El bloqueo físico es permanente. Usá la misma etiqueta durante toda la operación.</p>}
      <button type="button" className="button secondary" disabled={disabled || local || busy} onClick={() => void write()}><Smartphone size={17} />{busy ? "Esperando etiqueta…" : lock ? "Grabar y bloquear NFC" : "Grabar NFC"}</button>
      {busy && <button type="button" className="button secondary" onClick={() => controller.current?.abort()}><X size={16} />Cancelar NFC</button>}
    </>}
    {local && <p>Publicá el panel con HTTPS para grabar un enlace que funcione fuera de esta computadora.</p>}
    {disabled && <p>Guardá los cambios y activá el enlace antes de grabar.</p>}
    {status && <p className="nfc-status" role="status">{status}</p>}
  </section>;
}
