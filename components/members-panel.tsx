"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Send, Trash2, UserPlus, Users } from "lucide-react";
import type { Member } from "@/lib/members";
import { api } from "@/lib/client-api";

export function MembersPanel({ venueId, venueName }: { venueId: string; venueName: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let current = true;
    api<{ members: Member[] }>(`/api/venues/${venueId}/members`)
      .then(({ members }) => current && setMembers(members))
      .catch((e) => current && setError(e.message));
    return () => { current = false; };
  }, [venueId]);
  async function run(action: () => Promise<{ members?: Member[] }>, done: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await action();
      if (result.members) setMembers(result.members);
      setNotice(done);
      return true;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function invite(event: FormEvent) {
    event.preventDefault();
    const sent = await run(() => api(`/api/venues/${venueId}/members`, { method: "POST", body: JSON.stringify({ email }) }), `Listo. Si ${email} no tenía cuenta, le enviamos una invitación por email.`);
    if (sent) setEmail("");
  }
  return (
    <section className="venue-members">
      <h3><Users size={17} /> Usuarios del local</h3>
      <p>Entran con su email y solo pueden subir, ordenar y borrar las fotos del menú de {venueName}. No ven ni editan enlaces.</p>
      <form onSubmit={invite}>
        <input type="email" required aria-label="Email de la persona a invitar" placeholder="persona@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="button small primary" disabled={busy || !members}><UserPlus size={15} /> Invitar</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="menu-status" role="status">{notice}</p>}
      {members && !members.length && <p className="menu-empty">Todavía nadie más tiene acceso a este local.</p>}
      {!!members?.length && (
        <ul>
          {members.map((member) => (
            <li key={member.user_id}>
              <span><strong>{member.email}</strong>{member.pending ? "Invitación pendiente" : "Con acceso"}</span>
              <span className="venue-actions">
                <button className="button small secondary" disabled={busy} onClick={() => void run(() => api(`/api/venues/${venueId}/members/${member.user_id}`, { method: "POST" }), `Reenviamos el acceso a ${member.email}.`)}>
                  <Send size={14} /> {member.pending ? "Reenviar invitación" : "Enviar cambio de contraseña"}
                </button>
                <button className="icon-button danger" disabled={busy} aria-label={`Quitar acceso a ${member.email}`}
                  onClick={() => window.confirm(`¿Quitar el acceso de ${member.email} a ${venueName}?`) && void run(() => api(`/api/venues/${venueId}/members/${member.user_id}`, { method: "DELETE" }), "Acceso quitado.")}>
                  <Trash2 size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
