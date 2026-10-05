import SwiftUI

@main
struct QRStudioApp: App {
    var body: some Scene { WindowGroup { PanelView() } }
}

struct PanelView: View {
    @AppStorage("panelURL") private var savedURL = ""
    @State private var draft = ""
    @State private var error = ""
    @State private var configuring = false
    var body: some View {
        NavigationStack {
            if let url = validPanelURL(savedURL), !configuring {
                PanelWebView(url: url)
                    .ignoresSafeArea(.container, edges: .bottom)
                    .navigationTitle("QR Studio")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Dominio", systemImage: "gearshape") {
                                draft = savedURL; configuring = true
                            }
                        }
                    }
            } else {
                Form {
                    Section {
                        Text("Tu panel, también en iPhone.").font(.title2).bold()
                        Text("Conectá el dominio publicado de QR Studio. Vas a poder administrar locales, grabar enlaces y bloquear etiquetas NFC desde el mismo panel.")
                    }
                    Section("Dirección de tu panel") {
                        TextField("https://qr.tudominio.com", text: $draft)
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Text("Usá únicamente el dominio de tu propia instalación. Debe tener HTTPS.").font(.footnote)
                        if !error.isEmpty { Text(error).foregroundStyle(.red) }
                        Button("Conectar panel") {
                            guard let url = validPanelURL(draft) else {
                                error = "Ingresá un dominio HTTPS, sin usuario, contraseña, ruta ni parámetros."; return
                            }
                            savedURL = url.absoluteString; error = ""; configuring = false
                        }
                        if validPanelURL(savedURL) != nil {
                            Button("Cancelar") { configuring = false }
                        }
                    }
                    Section("Antes de grabar") {
                        Text("Usá una etiqueta NFC compatible con NDEF. El bloqueo contra reescritura es permanente. El enlace grabado seguirá apuntando al destino que elijas en tu panel.")
                    }
                }
                .navigationTitle("QR Studio")
                .onAppear { if draft.isEmpty { draft = savedURL } }
            }
        }.tint(Color(red: 0.11, green: 0.32, blue: 0.26))
    }
}

func validPanelURL(_ value: String) -> URL? {
    guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
          url.scheme == "https", let host = url.host, !host.isEmpty,
          url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
          url.path.isEmpty || url.path == "/" else { return nil }
    return url
}
