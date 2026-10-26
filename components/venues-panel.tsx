"use client";
import { Fragment, useState, type FormEvent } from "react";
import { ArrowUpRight, Images, Plus, Store, Trash2, Users } from "lucide-react";
import { isPlaceholder, type Venue, type QRRecord } from "@/lib/qr";
import { api } from "@/lib/client-api";
import { MenuPhotos } from "./menu-photos";
import { MembersPanel } from "./members-panel";
export function VenuesPanel({ venues, records, loading, onChange, onRecordsChanged, onError, onOpen, onEdit }: {
  venues: Venue[]; records: QRRecord[]; loading: boolean;
  onChange: (venues: Venue[]) => void; onRecordsChanged: () => void; onError: (message: string) => void;
  onOpen: (id: string) => void; onEdit: (record: QRRecord) => void;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<{ id: string; tab: "menu" | "members" } | null>(null);
  const toggle = (id: string, tab: "menu" | "members") => setOpen(open?.id === id && open.tab === tab ? null : { id, tab });
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError("");
    try {
      const { venue } = await api<{venue: Venue}>(editing ? `/api/venues/${editing}` : "/api/venues", { method: editing ? "PATCH" : "POST", body: JSON.stringify({ name }) });
      onChange([...venues.filter(v => v.id !== venue.id), venue].sort((a,b) => a.name.localeCompare(b.name)));
      // New venues come with their NFC and menu links.
      if (!editing) onRecordsChanged();
      setName(""); setEditing(null);
    } catch (error) { onError((error as Error).message); } finally { setBusy(false); }
  }
  async function remove(venue: Venue) {
    if (!window.confirm(`¿Eliminar el local “${venue.name}”? También se eliminan sus enlaces NFC y de menú sin configurar.`)) return;
    setBusy(true); onError("");
    try { await api(`/api/venues/${venue.id}`, { method: "DELETE" }); onChange(venues.filter(v => v.id !== venue.id)); onRecordsChanged(); }
    catch (error) { onError((error as Error).message); } finally { setBusy(false); }
  }
  return <section>
    <div className="page-heading"><div><h1>Cada local, en su lugar.</h1><p>Organizá sus QR, enlaces cortos, las fotos de su menú y quién puede editarlas.</p></div></div>
    <form className="venue-form" onSubmit={save}>
      <label htmlFor="venue-name">{editing ? "Editar nombre del local" : "Nombre del nuevo local"}</label>
      <div><input id="venue-name" placeholder="Ej. Café Centro" required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
        <button className="button primary" disabled={busy || loading}><Plus size={17} />{editing ? "Guardar local" : "Crear local"}</button>
        {editing && <button type="button" className="button secondary" onClick={() => { setEditing(null); setName(""); }}>Cancelar</button>}
      </div>
    </form>
    {loading ? <p role="status">Cargando locales…</p> : !venues.length ? <div className="empty-state"><Store size={40} /><h2>Empezá por tu primer local.</h2><p>Se crea con un enlace NFC y un QR de menú, todavía sin destino. Lo elegís al escanearlos por primera vez o desde el panel.</p></div> :
      <div className="venue-list">{venues.map(venue => {
        const links = records.filter(r => r.venue_id === venue.id);
        const menu = links.find(r => r.kind === "menu");
        const nfc = links.find(r => r.kind === "short");
        const pending = [nfc && isPlaceholder(nfc) && "NFC", menu && isPlaceholder(menu) && "menú"].filter(Boolean);
        return <Fragment key={venue.id}><article className="venue-row">
          <div><h2><button onClick={() => onOpen(venue.id)}>{venue.name} <ArrowUpRight size={16} /></button></h2>
            <p>{links.length} enlaces · {links.filter(r => r.active).length} activos · {menu ? menu.active ? "Menú activo" : "Menú pausado" : "Sin menú"}</p>
            {!!pending.length && <p>Sin destino en {pending.join(" y ")}: elegilo al escanearlo por primera vez o con Editar.</p>}
          </div>
          <div className="venue-actions">
            <button className="button secondary" onClick={() => onOpen(venue.id)}>Ver enlaces</button>
            {nfc && <button className="button secondary" onClick={() => onEdit(nfc)}>Editar NFC</button>}
            {menu && <button className="button secondary" onClick={() => onEdit(menu)}>Editar menú</button>}
            <button className="button secondary" aria-expanded={open?.id === venue.id && open.tab === "menu"} onClick={() => toggle(venue.id, "menu")}><Images size={16} /> Menú en fotos</button>
            <button className="button secondary" aria-expanded={open?.id === venue.id && open.tab === "members"} onClick={() => toggle(venue.id, "members")}><Users size={16} /> Usuarios</button>
            <button className="button small secondary" disabled={busy} onClick={() => { setEditing(venue.id); setName(venue.name); document.getElementById("venue-name")?.focus(); }}>Renombrar</button>
            <button className="icon-button" disabled={busy || links.some(r => !isPlaceholder(r))} aria-label={`Eliminar ${venue.name}`} title={links.some(r => !isPlaceholder(r)) ? "Primero mové o eliminá sus enlaces configurados" : "Eliminar local"} onClick={() => void remove(venue)}><Trash2 size={17}/></button>
          </div>
        </article>
        {open?.id === venue.id && <div className="venue-detail">
          {open.tab === "menu" ? <MenuPhotos venueId={venue.id} onPublished={onRecordsChanged} /> : <MembersPanel venueId={venue.id} venueName={venue.name} />}
        </div>}</Fragment>;
      })}</div>}
  </section>;
}
