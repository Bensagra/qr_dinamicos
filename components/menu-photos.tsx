"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Images, LoaderCircle, Trash2, Upload } from "lucide-react";
import type { Menu } from "@/lib/qr";
import { api } from "@/lib/client-api";

// Resized and re-encoded in the browser: phone photos weigh several MB and may be PNG or HEIC.
async function toJPEG(file: File) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`No pudimos abrir “${file.name}”. Probá con una foto JPG o PNG.`);
  });
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No pudimos preparar la foto."))), "image/jpeg", 0.85),
  );
}

export function MenuPhotos({ venueId, onPublished }: { venueId: string; onPublished?: () => void }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let current = true;
    api<{ menu: Menu }>(`/api/venues/${venueId}/menu`)
      .then(({ menu }) => current && setMenu(menu))
      .catch((e) => current && setError(e.message));
    return () => { current = false; };
  }, [venueId]);
  async function run(label: string, action: () => Promise<{ menu: Menu }>) {
    setStatus(label);
    setError("");
    try {
      setMenu((await action()).menu);
      onPublished?.();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setStatus("");
    }
  }
  async function upload(files: File[]) {
    for (const [index, file] of files.entries()) {
      const ok = await run(files.length > 1 ? `Subiendo foto ${index + 1} de ${files.length}…` : "Subiendo foto…", async () => {
        const form = new FormData();
        form.append("photo", await toJPEG(file), "foto.jpg");
        return api(`/api/venues/${venueId}/menu`, { method: "POST", body: form });
      });
      if (!ok) break;
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  function move(index: number, delta: number) {
    const order = menu!.photos.map((p) => p.id);
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    void run("Actualizando el orden…", () => api(`/api/venues/${venueId}/menu`, { method: "PATCH", body: JSON.stringify({ order }) }));
  }
  function remove(id: string, page: number) {
    if (!window.confirm(`¿Eliminar la página ${page} del menú?`)) return;
    void run("Eliminando foto…", () => api(`/api/venues/${venueId}/menu/${id}`, { method: "DELETE" }));
  }
  const photos = menu?.photos ?? [];
  return (
    <section className="menu-photos" aria-busy={!!status}>
      <div className="menu-photos-head">
        <div>
          <h3><Images size={17} /> Menú en fotos</h3>
          <p>Subí las fotos en el orden en que se leen. El QR de menú abre un PDF con todas las páginas y se actualiza solo con cada cambio.</p>
        </div>
        <div className="venue-actions">
          {menu?.pdf && (
            <a className="button small secondary" href={menu.pdf} target="_blank" rel="noreferrer">
              <FileText size={15} /> Ver PDF publicado
            </a>
          )}
          <button className="button small primary" disabled={!menu || !!status} onClick={() => fileRef.current?.click()}>
            {status ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />} Subir fotos
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload([...(e.target.files ?? [])])} />
        </div>
      </div>
      {status && <p className="menu-status" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!menu ? (
        !error && <p role="status">Cargando fotos…</p>
      ) : !photos.length ? (
        <p className="menu-empty">
          {menu.pdf ? "No quedan fotos. El último PDF publicado sigue en línea hasta que subas nuevas." : "Todavía no hay fotos. Subí la primera página del menú para publicar el PDF."}
        </p>
      ) : (
        <ol className="photo-grid">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- public storage URLs, already resized */}
              <img src={photo.url} alt={`Página ${index + 1} del menú`} loading="lazy" width={photo.width} height={photo.height} />
              <div className="photo-tools">
                <span>{index + 1}</span>
                <button className="icon-button" disabled={!!status || index === 0} aria-label={`Mover la página ${index + 1} antes`} onClick={() => move(index, -1)}><ArrowLeft size={16} /></button>
                <button className="icon-button" disabled={!!status || index === photos.length - 1} aria-label={`Mover la página ${index + 1} después`} onClick={() => move(index, 1)}><ArrowRight size={16} /></button>
                <button className="icon-button danger" disabled={!!status} aria-label={`Eliminar la página ${index + 1}`} onClick={() => remove(photo.id, index + 1)}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
