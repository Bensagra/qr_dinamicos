# QR Studio para iPhone

App propia en SwiftUI + WKWebView con **Core NFC nativo**. Abre la misma instalación HTTPS del panel y usa su autenticación: los locales, QR y enlaces no se duplican ni se guardan en otra base. Requiere iOS 17 o posterior y un iPhone con NFC compatible.

## Instalar en tu iPhone

1. Publicá la web y configurá Supabase siguiendo el [README principal](../README.md).
2. Abrí `QRStudio/QRStudio.xcodeproj` en Xcode.
3. Seleccioná el target **QRStudio → Signing & Capabilities**, tu **Team** de Apple Developer y un **Bundle Identifier** propio. Está activado **Automatically manage signing** y la capacidad **Near Field Communication Tag Reading**. La capacidad NFC requiere un equipo/perfil que la admita; una cuenta personal gratuita no cubre todas las capacidades.
4. Conectá tu iPhone, habilitá Developer Mode si el dispositivo lo solicita, elegilo como destino y presioná **Run**. El simulador puede mostrar la app, pero no grabar NFC.
5. En la primera pantalla ingresá el dominio HTTPS de tu panel, sin rutas ni parámetros. Ingresá con la misma cuenta administradora de la web.
6. Abrí un enlace guardado y activo. En **Tu enlace en una etiqueta NFC**, elegí **Grabar NFC** o activá **Bloquear contra reescritura después de grabar**. La app muestra una confirmación nativa adicional con la URL exacta.
7. Acercá una sola etiqueta al borde superior del iPhone y mantenela ahí hasta que termine. Comprobá el destino leyendo la etiqueta antes de colocarla en el local.

El proyecto está compilado y verificado **sin firma**; no incluye certificados, perfiles, cuenta Apple ni una IPA instalable. Para TestFlight, elegí un dispositivo genérico, **Product → Archive → Distribute App** desde tu cuenta y completá los datos requeridos por Apple. La publicación en App Store/TestFlight no está realizada.

## Comportamiento NFC

- Escribe un registro NDEF de tipo URI con el enlace corto, no texto plano ni la URL larga del menú.
- Consulta capacidad y estado de la etiqueta. Por defecto rechaza contenido existente; activá **Reemplazar el contenido actual** para sobrescribirlo.
- Si pedís bloqueo, escribe y bloquea **la misma etiqueta conectada** usando `writeLock`. El bloqueo es irreversible; el destino remoto sigue siendo editable.
- Devuelve éxito parcial si la escritura terminó pero el bloqueo no se confirmó. Cancelar no deshace una escritura o bloqueo ya efectuados: comprobá físicamente la etiqueta si hubo una interrupción.
- El puente nativo solo acepta mensajes del frame principal del dominio configurado y URLs `/r/` de ese mismo dominio. Los destinos externos se abren fuera del panel.
- Safari no puede grabar NFC; estos botones se habilitan al usar esta app. Android usa Web NFC en Chrome con HTTPS.
- La app incluye confirmaciones JavaScript, errores de carga y descarga/compartir archivos QR.

## Verificar compilación

Desde la raíz del proyecto:

```bash
npm run test:ios
xcodebuild -project ios/QRStudio/QRStudio.xcodeproj -scheme QRStudio \
  -sdk iphoneos -configuration Release -derivedDataPath /tmp/qr-studio-ios-device \
  CODE_SIGNING_ALLOWED=NO build
```

La prueba con hardware queda pendiente: etiqueta vacía; rechazo de etiqueta con contenido; sobrescritura autorizada; etiqueta sin espacio; etiqueta bloqueada; cancelación; escritura y bloqueo; apertura del mismo NFC desde iPhone y Android; edición/pausa/reactivación del destino desde el panel. Una etiqueta de prueba que se bloquee no podrá reutilizarse para escribir otro enlace.

Referencias: [Core NFC de Apple](https://developer.apple.com/documentation/corenfc/building-an-nfc-tag-reader-app), [writeLock](https://developer.apple.com/documentation/corenfc/nfcndeftag/writelock(completionhandler:)), [entitlement TAG vigente](https://developer.apple.com/forums/thread/781403).
