# QR Studio

Panel en español para administrar **locales, QR dinámicos y enlaces cortos para NFC**. Incluye una app propia de iPhone con Core NFC y grabación web en Chrome para Android. Los QR se descargan como PNG (1024 px) o SVG.

## Locales, URLs cortas y menús

1. En **Mis locales**, creá una sección por local. Podés renombrarla sin afectar sus enlaces.
2. Cada local nace con dos enlaces listos: **NFC** (URL corta para grabar en etiquetas, con su QR) y **Menú** (QR de menú). Arrancan **vacíos**, sin destino: lo elegís al escanearlos por primera vez (ver [QR vacíos](#qr-vacíos)) o con **Editar NFC** y **Editar menú** (tu web, una plataforma de cartas o un PDF externo), sin cambiar la URL corta. Los locales existentes sin enlaces los reciben al abrir el panel. Solo hay un enlace designado como menú por local.
3. **Acortar una URL** crea un enlace estable `https://tu-dominio/r/identificador`. Elegí su local y copiá la URL para compartirla o grabarla en NFC. También tiene un QR descargable y personalizable.
4. La biblioteca permite filtrar por local, uso y estado. Cada registro puede tener un destino distinto: menú, reseñas, WhatsApp, promociones, etc.
5. Editar el destino no cambia el QR ni el contenido que ya grabaste en NFC. Pausar impide la redirección del enlace y de todos los QR/etiquetas que lo usan; reactivar lo recupera. Si necesitás pausar NFC y QR por separado, creá dos enlaces.

Los enlaces solo redirigen, sin página intermedia. El acortador es propio, sin dependencia de Bitly u otro proveedor. La longitud depende también de tu dominio: elegí uno corto y definitivo.

Los locales con enlaces configurados no se pueden eliminar hasta mover o eliminar esos enlaces. Los enlaces que siguen vacíos se eliminan junto con el local. Los QR anteriores aparecen en **Sin local** y pueden asignarse sin cambiar su identificador.

## QR vacíos

Podés crear un QR sin destino: dejá vacío **Enlace de destino** (los enlaces NFC y de menú de cada local ya nacen así). Descargalo, imprimilo o grabalo en NFC como cualquier otro.

1. La primera vez que lo escaneás se abre **Elegí el destino** (`/configurar/identificador`). Si no tenés la sesión iniciada en ese teléfono, ingresás ahí mismo con tu email y contraseña.
2. Escribí o pegá la URL (si falta `https://`, se agrega) y tocá **Guardar destino**.
3. Desde ese momento queda fijo: cada escaneo redirige directo, sin página intermedia. Esa página no vuelve a aparecer ni permite cambiarlo; para modificarlo usá **Editar** en el panel.

Solo la cuenta dueña del panel puede elegir el destino: un visitante que escanee un QR vacío ve el aviso y el formulario de ingreso, pero no puede guardarlo. Los usuarios de local tampoco. Mientras el QR está vacío no se cuentan visitas. Si está pausado, muestra la página de enlace no disponible.

## Menú en fotos y usuarios por local

1. En **Mis locales → Menú en fotos**, subí las fotos de la carta en el orden en que se leen. Podés moverlas antes o después y eliminarlas.
2. Con cada cambio se arma un **PDF** (una página por foto, ancho A4) y el QR de menú del local pasa a abrir ese PDF. El QR impreso no cambia. Si el local no tenía enlace de menú, se crea uno.
3. Las fotos se achican en el navegador (2000 px como máximo, JPG) antes de subirse. Se admiten hasta 40 por local. Si borrás todas, el último PDF sigue en línea hasta que subas nuevas.
4. En **Mis locales → Usuarios**, invitá a una persona por email. Recibe un enlace para elegir su contraseña en `/bienvenida`. Si ya tenía cuenta en el panel (por ejemplo en otro local), solo suma este local.
5. Al ingresar, un usuario de local **solo** ve el menú en fotos de sus locales: puede subir, ordenar y borrar fotos. No ve ni modifica QR, enlaces cortos, NFC ni otros locales.
6. **Reenviar invitación** repite el email si todavía no entró. Si ya entró, se le envía un enlace para elegir una contraseña nueva. Al quitar el acceso, la cuenta se elimina si no le queda ningún otro local.

Si después editás a mano el destino del QR de menú, se mantiene hasta el próximo cambio de fotos, que lo vuelve a apuntar al PDF. El PDF y las fotos son públicos para quien tenga el enlace, como cualquier carta impresa.

## Grabar y bloquear NFC

- **Android:** abrí el panel publicado con HTTPS en Chrome, activá NFC, abrí un enlace guardado y pulsá **Grabar NFC**. Acercá una etiqueta compatible con NDEF. Se graba un registro URL.
- **iPhone:** usá la [app propia QR Studio](ios/README.md). Incluye el proyecto Xcode con grabación y bloqueo nativos; necesita tu firma Apple para instalarse. Safari permite administrar el panel, pero no grabar etiquetas.
- Por defecto solo se graban etiquetas vacías. Para reemplazar contenido, activá la opción correspondiente.
- **Bloquear contra reescritura** graba el enlace y vuelve la etiqueta permanentemente de solo lectura, después de confirmar. Mantené la misma etiqueta junto al teléfono durante toda la operación. No se puede deshacer ni realizar a distancia.
- La **pausa del enlace** sí es reversible y puede hacerse desde el panel en cualquier dispositivo. No modifica físicamente la etiqueta.
- Si falla el bloqueo después de grabar, se informa el resultado parcial. Cancelar no revierte operaciones ya completadas. Verificá la etiqueta antes de colocarla.
- La grabación se deshabilita en modo local para evitar etiquetas con enlaces inaccesibles desde otros teléfonos.

Compatibilidad web: [documentación de Chrome Web NFC](https://developer.chrome.com/docs/capabilities/nfc).

## Probar en tu computadora

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. Sin variables de Supabase, **solo en desarrollo**, se habilita el modo local. Los datos se guardan en `.data/qrs.json`, fuera de Git. No requiere una base de datos para probar la experiencia. Los QR de localhost no funcionan desde otro dispositivo y no deben imprimirse para uso público.

## Publicar en Vercel

### 1. Preparar Supabase

1. Creá un proyecto en [Supabase](https://supabase.com/dashboard).
2. Para una instalación nueva, en **SQL Editor** ejecutá una vez [`supabase/schema.sql`](supabase/schema.sql). **Si ya tenías una versión anterior**, ejecutá solo las migraciones que te falten, en orden y una vez cada una: [`supabase/migration-venues.sql`](supabase/migration-venues.sql) (locales), [`supabase/migration-menus.sql`](supabase/migration-menus.sql) (menú en fotos, usuarios por local y el bucket público `menus` de Storage) y [`supabase/migration-empty-qr.sql`](supabase/migration-empty-qr.sql) (QR vacíos; también vacía los enlaces NFC y de menú que seguían en `https://example.com/` sin visitas). No vuelvas a ejecutar el esquema completo ni una migración ya aplicada; conservan los QR y sus contadores.
3. En **Authentication → Users → Add user**, creá tu usuario con email y contraseña (confirmado).
4. En la configuración de Authentication, desactivá **Allow new users to sign up**. Nadie puede registrarse por su cuenta; los usuarios de local entran solo por invitación desde el panel (funciona con el registro desactivado).
5. En **Authentication → URL Configuration**, poné tu dominio como **Site URL** y agregá `https://tu-dominio/bienvenida` en **Redirect URLs**. Sin esto, los emails de invitación no vuelven al panel. Opcional: traducí al español las plantillas **Invite user** y **Reset password** en **Authentication → Emails**. Para enviar más que unos pocos emails por hora, configurá un SMTP propio.
6. Copiá la **Project URL**, la **publishable key** y una **secret key** (`sb_secret_…`, en **Project Settings → API Keys**). La clave secreta da acceso total al proyecto: va solo en Vercel, nunca en una variable `NEXT_PUBLIC_`, en el iPhone ni en el repositorio.

### 2. Configurar Vercel

1. Subí este proyecto a un repositorio e importalo en Vercel. Framework: **Next.js**. Build: `npm run build`. No cambies el output directory.
2. Definí estas variables en el entorno **Production**:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública/publicable del proyecto |
| `NEXT_PUBLIC_APP_URL` | Dominio definitivo del panel, por ejemplo `https://qr.tudominio.com`, sin `/` final |
| `ADMIN_EMAIL` | El email del usuario que creaste en Authentication |
| `SUPABASE_SECRET_KEY` | Clave secreta del proyecto. Necesaria para el menú en fotos y los usuarios por local |

3. Desplegá o hacé **Redeploy** después de cambiar las variables.
4. Abrí el dominio configurado e ingresá con tu email y contraseña.
5. Creá un QR, descargalo y probalo con la cámara de un teléfono antes de imprimirlo.

Si faltan variables, el despliegue muestra una pantalla de configuración y bloquea la API de gestión. **Nunca usa almacenamiento local en Vercel o en producción.**

Las mutaciones se aceptan solo desde `NEXT_PUBLIC_APP_URL`. Abrí el panel desde ese dominio, incluso si Vercel te da otros aliases de preview. Para probar Supabase localmente, copiá `.env.example` a `.env.local`, completá los valores y usá `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

### 3. Conservar tus QR

Cada QR contiene una URL estable: `https://tu-dominio/r/identificador`. El servidor busca el destino y responde con un **302 sin caché**, sin pantalla intermedia (salvo un QR vacío, que lleva a elegir su destino). La URL de destino puede modificarse sin cambiar el identificador. Los cambios visuales requieren descargar una nueva imagen, pero las impresiones anteriores siguen redirigiendo.

Conservá el dominio y la base de datos mientras uses los códigos. Cambiar de dominio no actualiza los QR impresos. Los QR locales no se migran automáticamente: creá los definitivos desde el dominio de producción. Pausar devuelve una página de enlace no disponible; reactivar recupera el destino. Eliminar es irreversible.

## Seguridad y datos

- Supabase Auth verifica el usuario en cada operación de gestión; `ADMIN_EMAIL` identifica la cuenta con acceso completo. Cualquier otra cuenta necesita estar invitada a un local y solo puede gestionar las fotos del menú de ese local.
- Las fotos, el PDF y los usuarios por local se manejan en el servidor con `SUPABASE_SECRET_KEY`, después de verificar la sesión y el local. Sus tablas no tienen acceso directo desde la API pública ni con la sesión de un usuario.
- Row Level Security limita las filas a su propietario. La API pública no puede listar ni editar QR.
- La función `resolve_qr` permite consultar únicamente un identificador opaco y actualiza el contador en una operación atómica.
- El contador mide aperturas del enlace, incluidas pruebas, bots y visitas repetidas; **no mide personas únicas**. No guardamos IP, ubicación ni datos personales de visitantes. HEAD no incrementa visitas.
- Se admiten destinos HTTP/HTTPS sin credenciales incrustadas. Los logos se guardan como PNG/JPG/WebP en la base de datos, hasta 250 KB. No se admiten SVG subidos.
- Se exige contraste oscuro/claro para mejorar la lectura y se usa corrección de errores alta. Probá siempre el resultado con tu cámara, especialmente con logo y al imprimir.
- Los registros de Supabase y Vercel y su disponibilidad dependen de tu configuración y plan. El código no promete disponibilidad ilimitada.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Las pruebas incluyen validación de URLs, contraste, logos, políticas RLS y resolución pública con PostgreSQL embebido (PGlite). No requieren credenciales externas.

Con `npm run dev` iniciado y Google Chrome instalado:

```bash
npm run test:browser
npm run test:venues
```

La prueba crea y elimina su propio QR, comprueba el diseño responsive, decodifica el PNG descargado, verifica los cambios de destino, pausa/reactivación, persistencia, búsqueda y protección de origen. Guarda capturas en `.impeccable/screenshots/`. Si tu servidor usa otro puerto, pasá `TEST_BASE_URL` con la URL correspondiente. Ejecutala en modo local, no sobre una base de datos real.

## Arquitectura

- `components/studio.tsx`: editor, biblioteca, acceso y configuración.
- `components/qr-preview.tsx`: vista previa y descarga con `qr-code-styling`.
- `app/api/qrs` y `app/api/venues`: gestión autenticada de enlaces y locales. `app/api/venues/[id]/menu` y `/members`: fotos del menú y usuarios del local.
- `lib/menu.ts`, `lib/pdf.ts` y `lib/storage.ts`: fotos, armado del PDF (sin dependencias) y archivos en Supabase Storage (o `.data/files` en modo local).
- `lib/members.ts` y `app/bienvenida`: invitaciones y elección de contraseña.
- `app/api/auth`: inicio y cierre de sesión. Las cookies se renuevan desde los Route Handlers; no se consultan sesiones en Server Components.
- `app/r/[slug]`: resolución pública sin caché.
- `app/configurar/[slug]` y `app/api/claim/[slug]`: primer escaneo de un QR vacío; guarda el destino solo si sigue vacío.
- `lib/repository.ts`: adaptación Supabase / desarrollo local.
- `supabase/schema.sql`: tablas, relación de propietario/local, menú único, permisos, políticas y resolución pública.
- `components/nfc-panel.tsx` y `lib/nfc.ts`: flujo de grabación Android/puente iOS, confirmación, cancelación y resultados parciales.
- `ios/QRStudio`: app iPhone con SwiftUI, WKWebView y Core NFC.

Documentación de referencia: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [QR Code Styling](https://github.com/kozakdenys/qr-code-styling).
