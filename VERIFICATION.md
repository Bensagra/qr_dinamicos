# Verificación de entrega

Comprobado el 5 de octubre de 2026.

## Web, persistencia y redirecciones

- `npm run typecheck`, `npm run lint` y `npm run build`: aprobados.
- `npm test`: **9 pruebas aprobadas**, incluyendo URLs y diseño QR; políticas RLS; pertenencia del local al propietario; un menú por local; prohibición de eliminar locales con enlaces; migración SQL de registros anteriores; migración del archivo local y 20 actualizaciones concurrentes sin pérdida; grabación NDEF URL, bloqueo solo tras escritura y éxito parcial; puente iOS y cancelación simulados.
- `npm run test:browser`: aprobado en Chrome, a 1440 y 390 px. Creación, persistencia, PNG y PNG con logo decodificados al enlace estable, SVG, destino editable, 302 sin caché, pausa/reactivación, búsqueda y rechazo de origen ajeno.
- `npm run test:venues`: aprobado. Creación/renombrado, menú externo, unicidad, asociación de enlaces, URL corta, filtros, pausa, persistencia, rechazo de ciclos hacia el propio acortador y borrado protegido. Sin errores JavaScript ni desborde horizontal.
- Se corrigió durante la prueba el rechazo de ciclos en desarrollo usando el origen validado de la solicitud, también cuando Next representa internamente el host de otra manera.
- Las pruebas de navegador crean y eliminan sus propios registros. No se modificó una base de Supabase externa.

## iPhone

- Xcode 26.2: compilación **Debug para iOS Simulator aprobada**, sin firma.
- Compilación **Release para iPhone (iphoneos) aprobada**, sin firma.
- App instalada y abierta en un simulador iPhone 17 Pro; pantalla nativa de configuración inspeccionada.
- NFC nativo usa `NFCNDEFReaderSession`, comprueba estado/capacidad/contenido y escribe/bloquea la misma etiqueta conectada. El puente valida dominio, frame principal y URL corta.
- Capacidad NFC con entitlement `TAG`; icono de app incluido.
- No se firmó ni publicó una IPA, ni se verificó escritura física en un teléfono. El simulador no permite validar NFC real.

## Revisión visual independiente

Disposition: **ship**. Remaining: **clear**.

| Hallazgo | Veredicto final |
| --- | --- |
| URL corta difícil de encontrar en móvil | **Resolved**: “Tu URL corta”, copiar y NFC aparecen directamente después del título; la personalización del QR es opcional y queda después. El enlace corto entra en el primer viewport móvil. |
| Regresiones de la corrección | Ninguna regresión material visible en las capturas. |

Se conservaron el diseño de la app, las filas de locales y la vista previa del QR. El detector se ejecutó una vez: sus avisos son principalmente valores del diseño preexistente; no se inició un rediseño de esos estilos.

Capturas en `.impeccable/screenshots/`: `venues-desktop.png`, `venues-mobile.png`, `short-desktop.png`, `short-mobile.png`, `ios-setup.png`, además de las capturas del circuito QR.

## Pendiente para uso real

1. Configurar Supabase y el dominio HTTPS de producción. En instalaciones existentes, aplicar **solo** `supabase/migration-venues.sql`; en nuevas, `supabase/schema.sql`.
2. Desplegar la web y comprobar autenticación/redirección contra ese Supabase real. No se suministraron configuración de producción ni acceso de despliegue.
3. Firmar la app de iPhone con el equipo Apple del propietario, instalarla y configurar el dominio publicado. No se suministró equipo/perfil de firma.
4. Probar etiquetas NDEF físicas en Android e iPhone: escritura, sobrescritura consentida, bloqueo permanente, errores y cancelación; después leer la etiqueta y comprobar cambio/pausa/reactivación del destino. El hardware NFC no se probó en esta sesión.

Instrucciones: [web](README.md) y [app iPhone](ios/README.md).
