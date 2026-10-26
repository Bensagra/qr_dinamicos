"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";

// Landing page of invitation and password-recovery emails: Supabase puts the session in the URL fragment.
export function Welcome() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "failed">("checking");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Read once before the effect clears the tokens from the address bar (effects may run twice in development).
  const [fragment] = useState(() => (typeof window === "undefined" ? "" : window.location.hash.slice(1)));
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(fragment);
    history.replaceState(null, "", window.location.pathname);
    const fail = (message: string) => { setError(message); setState("failed"); };
    if (hash.get("error_description"))
      return fail("El enlace venció o ya se usó. Pedí que te envíen uno nuevo.");
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token)
      return fail("Abrí esta página desde el enlace del email que te enviamos.");
    api("/api/auth/session", { method: "POST", body: JSON.stringify({ access_token, refresh_token }) })
      .then(() => setState("ready"))
      .catch((e) => fail(e.message));
  }, [fragment]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) return setError("Las contraseñas no coinciden.");
    setBusy(true); setError("");
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ password: data.get("password") }) });
      router.push("/");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return (
    <main className="auth-page">
      <div className="auth-box">
        <div className="brand">
          <span className="brand-mark"><QrCode size={23} strokeWidth={2.4} /></span>
          <span>qr<span className="brand-light">studio</span><span className="brand-period">.</span></span>
        </div>
        <h1>Tu menú,<br />en tus manos.</h1>
        {state === "checking" && <p role="status"><LoaderCircle size={16} className="spin" /> Verificando el enlace…</p>}
        {state === "failed" && <><p className="error" role="alert">{error}</p><p><Link href="/">Ir a ingresar</Link></p></>}
        {state === "ready" && (
          <>
            <p>Elegí una contraseña para entrar con tu email cuando quieras actualizar las fotos del menú.</p>
            <form onSubmit={submit}>
              <label>Contraseña nueva<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
              <label>Repetila<input type="password" name="confirm" autoComplete="new-password" minLength={8} required /></label>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="button primary" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} Guardar y entrar
              </button>
            </form>
          </>
        )}
        <p className="auth-note"><ShieldCheck size={16} /> Solo vas a poder editar el menú de tu local.</p>
      </div>
      <div className="auth-art">
        <QrCode size={210} strokeWidth={1.2} />
        <p>Tu menú,<br />siempre al día.</p>
      </div>
    </main>
  );
}
