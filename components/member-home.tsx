"use client";
import { useState } from "react";
import { LogOut, QrCode } from "lucide-react";
import type { Venue } from "@/lib/qr";
import { api } from "@/lib/client-api";
import { MenuPhotos } from "./menu-photos";

// What an invited venue user sees: only the menu photos of their venue(s).
export function MemberHome({ email, venues, onLogout }: { email: string; venues: Venue[]; onLogout: () => void }) {
  const [venueId, setVenueId] = useState(venues[0].id);
  const [error, setError] = useState("");
  const venue = venues.find((v) => v.id === venueId)!;
  async function logout() {
    try { await api("/api/auth", { method: "DELETE" }); onLogout(); }
    catch (e) { setError((e as Error).message); }
  }
  return (
    <div className="member-shell">
      <header className="member-top">
        <div className="brand">
          <span className="brand-mark"><QrCode size={23} strokeWidth={2.4} /></span>
          <span>qr<span className="brand-light">studio</span><span className="brand-period">.</span></span>
        </div>
        <span className="member-email">{email}</span>
        <button className="button small secondary" onClick={() => void logout()}><LogOut size={15} /> Cerrar sesión</button>
      </header>
      <main className="member-main">
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="page-heading">
          <div>
            <h1>{venue.name}</h1>
            <p>Los cambios se publican al instante en el QR de menú del local.</p>
          </div>
          {venues.length > 1 && (
            <label className="member-venue">Local
              <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <MenuPhotos key={venueId} venueId={venueId} />
      </main>
    </div>
  );
}
