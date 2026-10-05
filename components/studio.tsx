"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Copy,
  ExternalLink,
  Globe,
  LayoutGrid,
  Link2,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Store,
  X,
} from "lucide-react";
import {
  contrast,
  defaultDesign,
  qrInputSchema,
  type AppMode,
  type QRDesign,
  type QRInput,
  type QRRecord,
  type Venue,
} from "@/lib/qr";
import { QRPreview, type QRHandle } from "./qr-preview";

import { VenuesPanel } from "./venues-panel";
import { NFCPanel } from "./nfc-panel";

type View = "editor" | "library" | "settings" | "venues";
const emptyInput = (): QRInput => ({
  name: "",
  destination: "",
  active: true,
  venue_id: null,
  kind: "qr",
  design: { ...defaultDesign },
});
import { api } from "@/lib/client-api";
function Mark() {
  return (
    <span className="brand-mark">
      <QrCode size={23} strokeWidth={2.4} />
    </span>
  );
}
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      onSuccess();
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
          <Mark />
          <span>
            qr<span className="brand-light">studio</span>
            <span className="brand-period">.</span>
          </span>
        </div>
        <h1>
          Todo cambia.
          <br />
          Tu QR se queda.
        </h1>
        <p>Ingresá a tu espacio para administrar tus enlaces.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="vos@ejemplo.com"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <ArrowRight size={18} />
            )}{" "}
            Ingresar a mi espacio
          </button>
        </form>
        <p className="auth-note">
          <ShieldCheck size={16} /> Acceso privado a tu panel personal.
        </p>
      </div>
      <div className="auth-art">
        <QrCode size={210} strokeWidth={1.2} />
        <p>
          Un pequeño código.
          <br />
          Infinitas posibilidades.
        </p>
      </div>
    </main>
  );
}
export function Studio({
  mode,
  configuredOrigin,
}: {
  mode: AppMode;
  configuredOrigin: string;
}) {
  const [view, setView] = useState<View>("editor");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueFilter, setVenueFilter] = useState("all");
  const [showShortDesign, setShowShortDesign] = useState(false);
  const [kindFilter, setKindFilter] = useState("all");
  const [records, setRecords] = useState<QRRecord[]>([]);
  const [input, setInput] = useState<QRInput>(emptyInput);
  const [selected, setSelected] = useState<QRRecord | null>(null);
  const origin = configuredOrigin;
  const [loading, setLoading] = useState(mode !== "setup");
  const [login, setLogin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<"png" | "svg">("png");
  const qrRef = useRef<QRHandle>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = selected
    ? input.name !== selected.name ||
      input.destination !== selected.destination ||
      input.active !== selected.active ||
      input.venue_id !== selected.venue_id || input.kind !== selected.kind ||
      (Object.keys(defaultDesign) as (keyof QRDesign)[]).some(
        (key) => input.design[key] !== selected.design[key],
      )
    : !!(
        input.name ||
        input.destination ||
        (Object.keys(defaultDesign) as (keyof QRDesign)[]).some(
          (key) => input.design[key] !== defaultDesign[key],
        )
      );
  const link = `${origin}/r/${selected?.slug || "vista-previa"}`;
  const contrastOK =
    contrast(input.design.foreground, input.design.background) >= 4.5;
  const safeDesign = contrastOK
    ? input.design
    : { ...input.design, foreground: "#173E36", background: "#FFFFFF" };

  async function load() {
    try {
      const [result, locations] = await Promise.all([api<{ records: QRRecord[] }>("/api/qrs"), api<{ venues: Venue[] }>("/api/venues")]);
      setVenues(locations.venues);
      setRecords(result.records);
      setLogin(false);
      setError("");
    } catch (e) {
      if ((e as { status?: number }).status === 401) setLogin(true);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (mode === "setup") return;
    let current = true;
    Promise.all([api<{ records: QRRecord[] }>("/api/qrs"), api<{ venues: Venue[] }>("/api/venues")])
      .then(([result, locations]) => {
        if (current) {
          setRecords(result.records);
          setVenues(locations.venues);
          setLogin(false);
        }
      })
      .catch((e) => {
        if (!current) return;
        if (e.status === 401) setLogin(true);
        else setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [mode]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function canLeave() {
    return (
      !dirty ||
      window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?")
    );
  }
  function navigate(next: View) {
    if (next !== view && !canLeave()) return;
    setView(next);
    setMobileMenu(false);
    setError("");
  }
  function newQR(venueId?: string, kind: QRInput["kind"] = "qr") {
    if (!canLeave()) return;
    setSelected(null);
    setShowShortDesign(false);
    setInput({ ...emptyInput(), venue_id: venueId || (venueFilter !== "all" && venueFilter !== "none" ? venueFilter : null), kind });
    setFormErrors({});
    setError("");
    setView("editor");
    setMobileMenu(false);
  }
  function edit(record: QRRecord) {
    if (!canLeave()) return;
    setSelected(record);
    setInput({
      name: record.name,
      destination: record.destination,
      active: record.active,
      design: record.design,
      venue_id: record.venue_id,
      kind: record.kind,
    });
    setFormErrors({});
    setError("");
    setView("editor");
  }
  function design(patch: Partial<QRDesign>) {
    setInput((old) => ({ ...old, design: { ...old.design, ...patch } }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = qrInputSchema.safeParse(input);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues)
        errors[String(issue.path[0])] = issue.message;
      setFormErrors(errors);
      return;
    }
    setBusy(true);
    setFormErrors({});
    try {
      const { record } = await api<{ record: QRRecord }>(
        selected ? `/api/qrs/${selected.id}` : "/api/qrs",
        {
          method: selected ? "PATCH" : "POST",
          body: JSON.stringify(result.data),
        },
      );
      setRecords((old) => [record, ...old.filter((r) => r.id !== record.id)]);
      setSelected(record);
      setInput({
        name: record.name,
        destination: record.destination,
        active: record.active,
        design: record.design,
      venue_id: record.venue_id,
      kind: record.kind,
      });
      setNotice(
        selected
          ? "Cambios guardados. Tu QR conserva el mismo enlace."
          : "Tu QR está listo. Ya podés descargarlo.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Enlace copiado.");
    } catch {
      setError(
        "No se pudo copiar. Seleccioná el enlace y copialo manualmente.",
      );
    }
  }
  async function download() {
    try {
      await qrRef.current?.download(
        format,
        selected?.name.replace(/[^a-zA-Z0-9áéíóúñ_-]/gi, "-").slice(0, 60) ||
          "mi-qr",
      );
      setNotice(`QR descargado en ${format.toUpperCase()}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function toggle(record: QRRecord) {
    setBusy(true);
    setError("");
    try {
      const { record: updated } = await api<{ record: QRRecord }>(
        `/api/qrs/${record.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: record.name,
            destination: record.destination,
            design: record.design,
      venue_id: record.venue_id,
      kind: record.kind,
            active: !record.active,
          }),
        },
      );
      setRecords((old) => old.map((r) => (r.id === updated.id ? updated : r)));
      if (selected?.id === updated.id) {
        setSelected(updated);
        setInput({
          name: updated.name,
          destination: updated.destination,
          design: updated.design,
          venue_id: updated.venue_id,
          kind: updated.kind,
          active: updated.active,
        });
      }
      setNotice(
        updated.active
          ? "QR reactivado."
          : "QR pausado. Podés reactivarlo cuando quieras.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(record: QRRecord) {
    if (
      !window.confirm(
        `¿Eliminar “${record.name}”? El QR impreso dejará de funcionar. Esta acción no se puede deshacer.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/qrs/${record.id}`, { method: "DELETE" });
      setRecords((old) => old.filter((r) => r.id !== record.id));
      if (selected?.id === record.id) {
        setSelected(null);
        setInput(emptyInput());
      }
      setNotice("QR eliminado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 250 * 1024
    ) {
      setFormErrors({ logo: "Usá PNG, JPG o WebP de hasta 250 KB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        design({ logo: reader.result as string });
        setFormErrors({});
      };
      img.onerror = () =>
        setFormErrors({ logo: "No pudimos abrir esa imagen. Probá con otra." });
      img.src = reader.result as string;
    };
    reader.onerror = () =>
      setFormErrors({ logo: "No pudimos leer el archivo." });
    reader.readAsDataURL(file);
  }
  if (login) return <Login onSuccess={() => void load()} />;
  const visible = records.filter(
    (r) =>
      (venueFilter === "all" || (venueFilter === "none" ? !r.venue_id : r.venue_id === venueFilter)) &&
      (kindFilter === "all" || r.kind === kindFilter) &&
      (filter === "all" || (filter === "active" ? r.active : !r.active)) &&
      `${r.name} ${r.destination} ${r.slug}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button
          className="brand"
          onClick={() => newQR()}
          aria-label="QR Studio, inicio"
        >
          <Mark />
          <span>
            qr<span className="brand-light">studio</span>
            <span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Mi espacio</strong>
            <span>Panel personal</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <button className="button primary create-nav" onClick={() => newQR()}>
          <Plus size={19} /> Crear un QR
        </button>
        <nav aria-label="Navegación principal">
          <button
            className={
              view === "library" || view === "editor"
                ? "nav-link selected"
                : "nav-link"
            }
            onClick={() => navigate("library")}
          >
            <LayoutGrid size={19} /> Mis códigos QR{" "}
            <span className="nav-count">{records.length}</span>
          </button>
          <button className={view === "venues" ? "nav-link selected" : "nav-link"} onClick={() => navigate("venues")}>
            <Store size={19} /> Mis locales <span className="nav-count">{venues.length}</span>
          </button>
          <button className="nav-link" onClick={() => newQR(undefined, "short")}><Link2 size={19} /> Acortar una URL</button>
          <button
            className={view === "settings" ? "nav-link selected" : "nav-link"}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={19} /> Configuración
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="dynamic-note">
            <span className="small-icon">
              <RefreshCw size={19} />
            </span>
            <strong>
              El mismo QR.
              <br />
              Un nuevo destino.
            </strong>
            <p>Actualizá tus enlaces tantas veces como necesites.</p>
            <button onClick={() => helpRef.current?.showModal()}>
              Cómo funciona <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className="nav-link"
            onClick={() => helpRef.current?.showModal()}
          >
            <CircleHelp size={19} /> Ayuda rápida
          </button>
          {mode === "cloud" && (
            <button
              className="nav-link"
              onClick={async () => {
                if (!canLeave()) return;
                try {
                  await api("/api/auth", { method: "DELETE" });
                  setRecords([]);
                  setVenues([]);
                  setSelected(null);
                  setInput(emptyInput());
                  setLogin(true);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={18} /> Cerrar sesión
            </button>
          )}
          <div className="sidebar-footer">
            <span className="online-dot" />{" "}
            {mode === "local"
              ? "Espacio de prueba local"
              : mode === "cloud"
                ? "Conectado a Supabase"
                : "Conexión pendiente"}
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menú"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span>Mi espacio</span>
            <ChevronRight size={14} />
            <strong>
              {view === "editor"
                ? selected
                  ? "Editar QR"
                  : "Nuevo QR"
                : view === "library"
                  ? "Mis códigos QR"
                  : view === "venues" ? "Mis locales" : "Configuración"}
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection-tag ${mode === "local" ? "local" : ""}`}
            >
              <span />
              {mode === "local"
                ? "Modo local"
                : mode === "cloud"
                  ? "Mi panel"
                  : "Sin configurar"}
            </span>
            <span className="user-avatar" aria-label="Espacio personal">
              M
            </span>
          </div>
        </header>
        <main id="main" className="main-content">
          {mode === "local" && (
            <div className="local-banner">
              <Globe size={16} />
              <span>
                Estás probando en tu computadora. Conectá Supabase y publicá el
                panel para compartir tus QR.
              </span>
              <button onClick={() => navigate("settings")}>
                Ver cómo <ArrowRight size={14} />
              </button>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Cerrar error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {mode === "setup" ? (
            <section className="setup-state">
              <Settings2 size={36} />
              <h1>Tu espacio está casi listo.</h1>
              <p>
                Configurá Supabase, tu dominio y el email de acceso para activar
                el panel. Encontrás los pasos y el SQL en el README del
                proyecto.
              </p>
              <div className="code-list">
                <code>NEXT_PUBLIC_SUPABASE_URL</code>
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
                <code>NEXT_PUBLIC_APP_URL</code>
                <code>ADMIN_EMAIL</code>
              </div>
              <p>
                Una vez configuradas las variables, volvé a desplegar en Vercel.
              </p>
            </section>
          ) : view === "venues" ? (
            <VenuesPanel venues={venues} records={records} loading={loading} onChange={setVenues} onError={setError}
              onOpen={(id) => { setVenueFilter(id); setKindFilter("all"); setSearch(""); setFilter("all"); navigate("library"); }}
              onMenu={(venue) => { const menu = records.find(r => r.venue_id === venue.id && r.kind === "menu"); if (menu) edit(menu); else newQR(venue.id, "menu"); }} />
          ) : view === "editor" ? (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    {input.kind === "short" ? selected ? "Tu enlace corto está listo." : "Acortá tu enlace." : selected
                      ? "Un nuevo destino. El mismo QR."
                      : input.kind === "menu" ? "El menú de tu local." : "Creá tu próximo QR."}
                  </h1>
                  <p>
                    {selected
                      ? "Actualizá el enlace o el diseño de tu código."
                      : "Tu estilo, tu enlace. Y la libertad de cambiarlo después."}
                  </p>
                </div>
                <span className="subtle-tag">
                  <RefreshCw size={14} /> QR dinámico
                </span>
              </div>
              {selected && input.kind === "short" && <div className="short-output">
                <div className="permanent-link">
                  <h2>Tu URL corta</h2>
                  <label htmlFor="short-link">Enlace permanente del QR</label>
                  <div><input id="short-link" readOnly value={link} />
                    <button type="button" className="icon-button" aria-label="Copiar enlace permanente" onClick={() => void copy(link)}><Copy size={17}/></button>
                  </div>
                  <p>Compartí este enlace o grabalo en NFC. Podés cambiar el destino sin cambiar la URL.</p>
                  <a href={link} target="_blank" rel="noopener noreferrer">Probar redirección <ExternalLink size={13}/></a>
                  <button className="button secondary" disabled={busy || dirty} onClick={() => void toggle(selected)}>{selected.active ? "Pausar enlace" : "Reactivar enlace"}</button>
                  {!selected.active && <p>Enlace pausado: el QR y el NFC no redirigen.</p>}
                </div>
                <NFCPanel key={selected.id} url={link} disabled={dirty || busy || !selected.active} local={mode === "local"} />
              </div>}
              <div className={`mobile-proof ${input.kind === "short" ? "short-proof" : ""}`}>
                <QRPreview data={link} design={safeDesign} size={76} />
                <div>
                  <strong>Tu QR, en vivo</strong>
                  <span>
                    {input.name || "Personalizalo y mirá cómo cambia."}
                  </span>
                  <small>
                    {selected
                      ? dirty
                        ? "Cambios sin guardar"
                        : "Diseño guardado"
                      : "Vista previa · Guardá para activarlo"}
                  </small>
                </div>
                <span className="live-label">
                  <span />
                </span>
              </div>
              <form className="editor-layout" onSubmit={save} noValidate>
                <div className="editor-form">
                  <section className="form-section">
                    <div className="section-heading">
                      <span className="section-icon">
                        <Link2 size={19} />
                      </span>
                      <div>
                        <h2>¿A dónde vamos?</h2>
                        <p>Elegí el nombre y el destino de tu QR.</p>
                      </div>
                    </div>
                    <div className="assignment-fields">
                      <div className="field-group"><label htmlFor="venue">Local</label>
                        <select id="venue" value={input.venue_id || ""} onChange={e => setInput({ ...input, venue_id: e.target.value || null })}>
                          <option value="">Sin local</option>{venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <p className="field-hint">Creá tus secciones desde Mis locales.</p>
                      </div>
                      <div className="field-group"><label htmlFor="link-kind">Uso del enlace</label>
                        <select id="link-kind" value={input.kind} onChange={e => setInput({ ...input, kind: e.target.value as QRInput["kind"] })}>
                          <option value="qr">QR general</option><option value="short">URL corta / NFC</option><option value="menu">Menú del local</option>
                        </select>
                      </div>
                    </div>
                    <div className="field-group">
                      <label htmlFor="qr-name">
                        Nombre del QR <span>Solo lo ves vos</span>
                      </label>
                      <input
                        id="qr-name"
                        placeholder="Ej. Carta del restaurante"
                        maxLength={80}
                        value={input.name}
                        onChange={(e) =>
                          setInput({ ...input, name: e.target.value })
                        }
                        aria-invalid={!!formErrors.name}
                        aria-describedby={
                          formErrors.name ? "name-error" : undefined
                        }
                      />
                      {formErrors.name && (
                        <p id="name-error" className="field-error">
                          {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="field-group">
                      <label htmlFor="qr-url">Enlace de destino</label>
                      <div className="input-with-icon">
                        <Globe size={17} />
                        <input
                          id="qr-url"
                          type="url"
                          placeholder="https://tusitio.com"
                          value={input.destination}
                          onChange={(e) =>
                            setInput({ ...input, destination: e.target.value })
                          }
                          aria-invalid={!!formErrors.destination}
                          aria-describedby={
                            formErrors.destination ? "url-error" : "url-hint"
                          }
                        />
                      </div>
                      {formErrors.destination ? (
                        <p id="url-error" className="field-error">
                          {formErrors.destination}
                        </p>
                      ) : (
                        <p id="url-hint" className="field-hint">
                          Una web, tu WhatsApp, un menú o lo que quieras
                          compartir.
                        </p>
                      )}
                    </div>
                  </section>
                  {input.kind === "short" && <div className="short-design-toggle"><button type="button" className="button secondary" aria-expanded={showShortDesign} onClick={() => setShowShortDesign(!showShortDesign)}>{showShortDesign ? "Ocultar diseño del QR" : "Personalizar el QR de este enlace"}</button></div>}
                  {(input.kind !== "short" || showShortDesign) && <section className="form-section design-section">
                    <div className="section-heading">
                      <span className="section-icon">
                        <Palette size={19} />
                      </span>
                      <div>
                        <h2>Hacelo tuyo</h2>
                        <p>Un pequeño código, con tu identidad.</p>
                      </div>
                    </div>
                    <div className="color-row">
                      {(["foreground", "background"] as const).map((key) => (
                        <div className="field-group" key={key}>
                          <label htmlFor={`color-${key}`}>
                            {key === "foreground"
                              ? "Color del QR"
                              : "Color de fondo"}
                          </label>
                          <div className="color-control">
                            <input
                              id={`color-${key}`}
                              type="color"
                              value={input.design[key]}
                              onChange={(e) =>
                                design({ [key]: e.target.value })
                              }
                            />
                            <span>{input.design[key].toUpperCase()}</span>
                            <span className="color-caret">
                              <MoreHorizontal size={16} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="preset-row">
                      <span>Probá una combinación</span>
                      {[
                        { foreground: "#173E36", background: "#FFFFFF" },
                        { foreground: "#172C52", background: "#F2F5FB" },
                        { foreground: "#592D50", background: "#FFF6FC" },
                        { foreground: "#212121", background: "#FFFFFF" },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`color-preset ${input.design.foreground.toUpperCase() === preset.foreground ? "active" : ""}`}
                          style={{ background: preset.foreground }}
                          onClick={() => design(preset)}
                          aria-label={`Combinación ${["bosque", "azul", "ciruela", "negro"][i]}`}
                          aria-pressed={
                            input.design.foreground.toUpperCase() ===
                            preset.foreground
                          }
                        >
                          {input.design.foreground.toUpperCase() ===
                            preset.foreground && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                    <fieldset className="shape-field">
                      <legend>Forma de los puntos</legend>
                      <div className="shape-options">
                        {(["square", "rounded", "dots"] as const).map(
                          (dots, index) => (
                            <button
                              key={dots}
                              type="button"
                              className={`shape-option ${input.design.dots === dots ? "active" : ""}`}
                              aria-pressed={input.design.dots === dots}
                              onClick={() => design({ dots })}
                            >
                              <span className={`dot-sample ${dots}`}>
                                {Array.from({ length: 9 }, (_, i) => (
                                  <i key={i} />
                                ))}
                              </span>
                              <span>
                                {
                                  ["Cuadrados", "Redondeados", "Círculos"][
                                    index
                                  ]
                                }
                              </span>
                              {input.design.dots === dots && (
                                <Check className="shape-check" size={14} />
                              )}
                            </button>
                          ),
                        )}
                      </div>
                    </fieldset>
                    <fieldset className="shape-field corners-field">
                      <legend>Estilo de las esquinas</legend>
                      <div className="segmented">
                        {(["square", "extra-rounded", "dot"] as const).map(
                          (corners, i) => (
                            <button
                              key={corners}
                              type="button"
                              aria-pressed={input.design.corners === corners}
                              className={
                                input.design.corners === corners ? "active" : ""
                              }
                              onClick={() => design({ corners })}
                            >
                              <span
                                className={`corner-sample corner-${corners}`}
                              />
                              {["Clásicas", "Suaves", "Circulares"][i]}
                            </button>
                          ),
                        )}
                      </div>
                    </fieldset>
                    <div className="field-group logo-group">
                      <label>
                        Tu logo <span>Opcional</span>
                      </label>
                      <input
                        ref={fileRef}
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        tabIndex={-1}
                        onChange={(e) => {
                          void upload(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <div className="upload-zone">
                        <span className="upload-icon">
                          {input.design.logo ? (
                            <CheckCheck size={20} />
                          ) : (
                            <Upload size={20} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {input.design.logo
                              ? "Logo agregado"
                              : "Sumá tu marca al centro"}
                          </strong>
                          <span>PNG, JPG o WebP · Hasta 250 KB</span>
                        </div>
                        <button
                          type="button"
                          className="button small secondary"
                          onClick={() => fileRef.current?.click()}
                        >
                          {input.design.logo ? "Cambiar" : "Subir logo"}
                        </button>
                        {input.design.logo && (
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Quitar logo"
                            onClick={() => design({ logo: null })}
                          >
                            <X size={17} />
                          </button>
                        )}
                      </div>
                      {formErrors.logo && (
                        <p className="field-error">{formErrors.logo}</p>
                      )}
                    </div>
                    {(!contrastOK || formErrors.design) && (
                      <p className="field-error" role="alert">
                        {formErrors.design ||
                          "Elegí un QR más oscuro y un fondo más claro. La vista previa usa colores seguros hasta corregirlo."}
                      </p>
                    )}
                  </section>
                  }
                  <div className="form-actions">
                    <span>
                      <ShieldCheck size={16} />{" "}
                      {selected
                        ? "El enlace de tu QR no cambia"
                        : "Podés editar el destino después"}
                    </span>
                    <button
                      type="submit"
                      className="button primary"
                      disabled={busy || loading || !contrastOK}
                    >
                      {busy ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : selected ? (
                        <Check size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                      {busy
                        ? "Guardando…"
                        : selected
                          ? "Guardar cambios"
                          : input.kind === "short" ? "Acortar URL" : "Crear mi QR"}
                    </button>
                  </div>
                </div>
                <aside className="preview-column">
                  <div className="preview-panel">
                    <div className="preview-heading">
                      <h2>Así se ve tu QR</h2>
                      <span className="live-label">
                        <span /> En vivo
                      </span>
                    </div>
                    <div className="qr-stage">
                      <span className="registration top-left" />
                      <span className="registration top-right" />
                      <span className="registration bottom-left" />
                      <span className="registration bottom-right" />
                      <div className="qr-paper">
                        <QRPreview
                          ref={qrRef}
                          data={link}
                          design={safeDesign}
                          size={258}
                        />
                      </div>
                    </div>
                    <div className="preview-name">
                      {input.name || "Tu próximo gran enlace"}
                    </div>
                    <div className="preview-status">
                      {selected ? (
                        <>
                          <span
                            className={`status-dot ${selected.active ? "" : "paused"}`}
                          />
                          {selected.active ? "QR activo" : "QR pausado"}
                          {dirty && " · Cambios sin guardar"}
                        </>
                      ) : (
                        "Vista previa · Creá el QR para activarlo"
                      )}
                    </div>
                    <div className="download-row">
                      <select
                        aria-label="Formato de descarga"
                        value={format}
                        onChange={(e) =>
                          setFormat(e.target.value as "png" | "svg")
                        }
                      >
                        <option value="png">PNG</option>
                        <option value="svg">SVG</option>
                      </select>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={!selected || dirty || busy}
                        onClick={() => void download()}
                      >
                        <ArrowDownToLine size={17} /> Descargar QR
                      </button>
                    </div>
                    <p className="download-hint">
                      PNG en 1024 px · SVG para imprimir
                    </p>
                  </div>
                  <div className="destination-summary">
                    <div className="summary-icon">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <strong>Un QR que sigue tu ritmo.</strong>
                      <p>
                        Cambiá el destino desde este panel. Los QR que ya
                        compartiste siguen funcionando.
                      </p>
                    </div>
                  </div>
                  {selected && input.kind !== "short" && (
                    <div className="permanent-link">
                      <label htmlFor="permanent-link">
                        Enlace permanente del QR
                      </label>
                      <div>
                        <input id="permanent-link" readOnly value={link} />
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Copiar enlace permanente"
                          onClick={() => void copy(link)}
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        Probar redirección <ExternalLink size={13} />
                      </a>
                      <p>Tu URL corta para compartir, imprimir o grabar en NFC. Siempre redirige al destino externo.</p>
                    </div>
                  )}
                  {selected && input.kind !== "short" && <NFCPanel key={selected.id} url={link} disabled={dirty || busy || !selected.active} local={mode === "local"} />}
                  {selected && input.kind !== "short" && (
                    <button
                      type="button"
                      className="pause-link"
                      disabled={busy || dirty}
                      onClick={() => void toggle(selected)}
                    >
                      {selected.active ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                      {selected.active ? "Pausar este QR" : "Reactivar este QR"}
                    </button>
                  )}
                </aside>
              </form>
            </>
          ) : view === "library" ? (
            <>
              <div className="page-heading">
                <div>
                  <h1>{venues.find(v => v.id === venueFilter)?.name || "QR y enlaces cortos."}</h1>
                  <p>
                    Editá el destino, descargá el diseño y seguí tus enlaces.
                  </p>
                </div>
                <button className="button primary" onClick={() => newQR()}>
                  <Plus size={17} /> Crear un QR
                </button>
              </div>
              <div className="link-filters">
                <label>Local<select aria-label="Filtrar por local" value={venueFilter} onChange={e => setVenueFilter(e.target.value)}>
                  <option value="all">Todos los locales</option><option value="none">Sin local</option>{venues.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}
                </select></label>
                <label>Uso<select aria-label="Filtrar por uso" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
                  <option value="all">Todos los enlaces</option><option value="qr">QR generales</option><option value="short">URL cortas / NFC</option><option value="menu">Menús</option>
                </select></label>
              </div>
              <div className="library-toolbar">
                <div
                  className="library-tabs"
                  role="group"
                  aria-label="Filtrar QR"
                >
                  <button
                    onClick={() => setFilter("all")}
                    className={filter === "all" ? "active" : ""}
                  >
                    Todos <span>{records.length}</span>
                  </button>
                  <button
                    onClick={() => setFilter("active")}
                    className={filter === "active" ? "active" : ""}
                  >
                    Activos
                  </button>
                  <button
                    onClick={() => setFilter("paused")}
                    className={filter === "paused" ? "active" : ""}
                  >
                    Pausados
                  </button>
                </div>
                <div className="library-search">
                  <Search size={17} />
                  <input
                    aria-label="Buscar QR"
                    placeholder="Buscar un QR…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  className="icon-button"
                  aria-label="Actualizar lista y visitas"
                  onClick={() => {
                    setLoading(true);
                    void load();
                  }}
                  disabled={loading}
                >
                  <RefreshCw size={17} className={loading ? "spin" : ""} />
                </button>
              </div>
              {loading ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" size={30} />
                  <p>Cargando tus QR…</p>
                </div>
              ) : !visible.length ? (
                <div className="empty-state">
                  <span className="empty-art">
                    <QrCode size={56} strokeWidth={1.3} />
                    <Plus size={20} />
                  </span>
                  <h2>
                    {records.length
                      ? "No encontramos ese QR."
                      : "Tu primer QR te está esperando."}
                  </h2>
                  <p>
                    {records.length
                      ? "Probá otro nombre o cambiá el filtro."
                      : "Conectá algo del mundo real con tu próximo destino digital."}
                  </p>
                  {!records.length && (
                    <button className="button primary" onClick={() => newQR()}>
                      <Plus size={17} /> Crear mi primer QR
                    </button>
                  )}
                </div>
              ) : (
                <div className="qr-list">
                  {visible.map((record) => (
                    <article className="qr-list-row" key={record.id}>
                      <button
                        className="list-qr"
                        aria-label={`Editar ${record.name}`}
                        onClick={() => edit(record)}
                      >
                        <QRPreview
                          data={`${origin}/r/${record.slug}`}
                          design={record.design}
                          size={72}
                        />
                      </button>
                      <div className="list-record">
                        <button onClick={() => edit(record)}>
                          {record.name}
                        </button>
                        <a
                          href={record.destination}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {record.destination}
                          <ArrowUpRight size={13} />
                        </a>
                        <span>
                          {venues.find(v => v.id === record.venue_id)?.name || "Sin local"} · {record.kind === "menu" ? "Menú" : record.kind === "short" ? "URL corta / NFC" : "QR"} · Creado el{" "}
                          {new Date(record.created_at).toLocaleDateString(
                            "es-AR",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                      </div>
                      <span
                        className={`record-state ${record.active ? "" : "paused"}`}
                      >
                        <span />
                        {record.active ? "Activo" : "Pausado"}
                      </span>
                      <div className="visits">
                        <strong>{record.scans.toLocaleString("es-AR")}</strong>
                        <span>visitas</span>
                      </div>
                      <div className="row-actions">
                        <button
                          className="button small secondary"
                          onClick={() => edit(record)}
                        >
                          Editar <ArrowUpRight size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Copiar enlace de ${record.name}`}
                          onClick={() =>
                            void copy(`${origin}/r/${record.slug}`)
                          }
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`${record.active ? "Pausar" : "Reactivar"} ${record.name}`}
                          onClick={() => void toggle(record)}
                        >
                          {record.active ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                        <button
                          className="icon-button danger"
                          disabled={busy}
                          aria-label={`Eliminar ${record.name}`}
                          onClick={() => void remove(record)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="library-footnote">
                Las visitas cuentan aperturas del enlace, incluidas pruebas y
                visitas repetidas. No representan personas únicas.
              </p>
            </>
          ) : (
            <section className="settings-page">
              <div className="page-heading">
                <div>
                  <h1>Tu espacio, conectado.</h1>
                  <p>Lo que necesitás para llevar tus QR al mundo real.</p>
                </div>
              </div>
              <div className="settings-section">
                <h2>
                  <Globe size={20} /> Dominio de tus QR
                </h2>
                <p>
                  Los códigos apuntan a este dominio. Una vez impresos, conservá
                  el mismo dominio para que sigan funcionando.
                </p>
                <div className="domain-display">
                  {origin || "Cargando…"}
                  <span>{mode === "local" ? "Local" : "Producción"}</span>
                </div>
              </div>
              <div className="settings-section">
                <h2>
                  <ShieldCheck size={20} /> Base de datos y acceso
                </h2>
                <p>
                  {mode === "cloud"
                    ? "El panel usa Supabase para guardar tus QR y proteger el acceso a tu cuenta."
                    : "Los QR se guardan en esta computadora. Para publicarlos, conectá la base de datos y desplegá la aplicación."}
                </p>
                <ol className="setup-steps">
                  <li>
                    <strong>Creá un proyecto en Supabase.</strong>
                    <span>
                      Ejecutá el archivo <code>supabase/schema.sql</code> en el
                      SQL Editor.
                    </span>
                  </li>
                  <li>
                    <strong>Creá tu usuario de acceso.</strong>
                    <span>
                      En Authentication, agregá tu email y contraseña. Desactivá
                      el registro público.
                    </span>
                  </li>
                  <li>
                    <strong>Conectá el proyecto en Vercel.</strong>
                    <span>
                      Configurá las cuatro variables de{" "}
                      <code>.env.example</code> y volvé a desplegar.
                    </span>
                  </li>
                </ol>
                <p className="settings-note">
                  Los QR de prueba no se migran automáticamente. Creá los
                  definitivos después de configurar el dominio público.
                </p>
                <a
                  className="button secondary"
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir Supabase <ExternalLink size={16} />
                </a>
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>Hecho para conectar.</span>
            <span>
              <Link2 size={13} /> Tus enlaces, bajo tu control.
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <dialog ref={helpRef} className="help-dialog">
        <div className="dialog-heading">
          <h2>Un QR, muchos destinos.</h2>
          <button
            className="icon-button"
            aria-label="Cerrar ayuda"
            onClick={() => helpRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="help-flow">
          <QrCode size={30} />
          <ArrowRight size={18} />
          <Link2 size={26} />
          <ArrowRight size={18} />
          <Globe size={28} />
        </div>
        <p>
          Tu QR guarda un enlace permanente de tu aplicación. Cuando alguien lo
          escanea, la aplicación consulta el destino actual y lo redirige
          directamente.
        </p>
        <p>
          <strong>¿Cambió tu web?</strong> Editá el enlace de destino y guardá.
          El QR impreso sigue siendo el mismo.
        </p>
        <p>
          <strong>¿Cambiaste los colores o el logo?</strong> Descargá el nuevo
          diseño para usarlo en próximas impresiones.
        </p>
        <p>
          Si pausás o eliminás un QR, el enlace deja de redirigir. Conservá tu
          dominio y la base de datos mientras uses los códigos.
        </p>
        <button
          className="button primary"
          onClick={() => helpRef.current?.close()}
        >
          Entendido <Check size={17} />
        </button>
      </dialog>
    </div>
  );
}
