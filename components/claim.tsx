"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { destinationSchema } from "@/lib/qr";

type State = "checking" | "login" | "ready" | "done" | "failed";
// Opened by the first scan of an empty QR: its owner signs in (if needed) and chooses where it leads from now on.
export function Claim({ slug }: { slug: string }) {
  const [state, setState] = useState<State>("checking");
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Bumped after signing in to ask again.
  const [attempt, setAttempt] = useState(0);
  // Is the QR still empty, and may whoever opened this page set it?
  useEffect(() => {
    let current = true;
    api<{ qr: { name: string } }>(`/api/claim/${slug}`)
      .then(({ qr }) => {
        if (!current) return;
        setName(qr.name);
        setState("ready");
      })
      .catch((e) => {
        if (!current) return;
        if (e.status === 401) setState("login");
        // It already has a destination: scanning now redirects there.
        else if (e.status === 409) window.location.replace(`/r/${slug}`);
        else {
          setError(e.message);
          setState("failed");
        }
      });
    return () => {
      current = false;
    };
  }, [slug, attempt]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      setState("checking");
      setAttempt((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    // On a phone it's easy to skip the scheme: "instagram.com/local" means https.
    const value = destination.trim();
    const parsed = destinationSchema.safeParse(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    if (!value || !parsed.success)
      return setError("Ingresá una URL válida, por ejemplo https://tusitio.com.");
    setBusy(true);
    setError("");
    try {
      const { record } = await api<{ record: { destination: string } }>(`/api/claim/${slug}`, {
        method: "POST",
        body: JSON.stringify({ destination: parsed.data }),
      });
      setDestination(record.destination);
      setState("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-box">
        <div className="brand">
          <span className="brand-mark"><QrCode size={23} strokeWidth={2.4} /></span>
          <span>qr<span className="brand-light">studio</span><span className="brand-period">.</span></span>
        </div>
        {state === "done" ? (
          <>
            <h1>Listo.<br />Tu QR ya tiene destino.</h1>
            <p>Desde ahora, cada vez que lo escaneen va directo a:</p>
            <p className="claim-destination">{destination}</p>
            <a className="button primary" href={destination}>
              Abrir el destino <ArrowUpRight size={18} />
            </a>
            <p className="auth-note"><ShieldCheck size={16} /> <span>Podés cambiarlo desde el <Link href="/">panel</Link> sin reimprimir el QR.</span></p>
          </>
        ) : (
          <>
            <h1>Este QR todavía<br />no tiene destino.</h1>
            {state === "checking" && <p role="status"><LoaderCircle size={16} className="spin" /> Buscando el QR…</p>}
            {state === "failed" && <><p className="error" role="alert">{error}</p><p><Link href="/">Ir al panel</Link></p></>}
            {state === "login" && (
              <>
                <p>Si es tuyo, ingresá para elegir a dónde lleva.</p>
                <form onSubmit={login}>
                  <label>Email<input type="email" name="email" autoComplete="username" placeholder="vos@ejemplo.com" required /></label>
                  <label>Contraseña<input type="password" name="password" autoComplete="current-password" required /></label>
                  {error && <p className="error" role="alert">{error}</p>}
                  <button className="button primary" disabled={busy}>
                    {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} Ingresar
                  </button>
                </form>
              </>
            )}
            {state === "ready" && (
              <>
                <p>Elegí a dónde lleva <strong>{name}</strong>. Queda fijo: cada escaneo va a ir directo a ese enlace.</p>
                <form onSubmit={save} noValidate>
                  <label>
                    Enlace de destino
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      autoCapitalize="none"
                      placeholder="https://tusitio.com"
                      maxLength={2048}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      aria-invalid={!!error}
                      required
                    />
                  </label>
                  {error && <p className="error" role="alert">{error}</p>}
                  <button className="button primary" disabled={busy}>
                    {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} Guardar destino
                  </button>
                </form>
              </>
            )}
            <p className="auth-note"><ShieldCheck size={16} /> Solo la cuenta dueña del panel puede elegir el destino.</p>
          </>
        )}
      </div>
      <div className="auth-art">
        <QrCode size={210} strokeWidth={1.2} />
        <p>Escanealo una vez.<br />Funciona para siempre.</p>
      </div>
    </main>
  );
}
