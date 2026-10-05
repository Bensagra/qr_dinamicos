import SwiftUI
import WebKit
import CoreNFC
import UniformTypeIdentifiers

struct PanelWebView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> PanelController { PanelController(panelURL: url) }
    func updateUIViewController(_ controller: PanelController, context: Context) {}
    static func dismantleUIViewController(_ controller: PanelController, coordinator: ()) { controller.tearDown() }
}

final class PanelController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply, WKDownloadDelegate {
    let panelURL: URL
    private var webView: WKWebView!
    private let nfc = NFCWriter()
    private var pendingConfirmation: ((Any?, String?) -> Void)?
    private var downloads: [ObjectIdentifier: URL] = [:]
    init(panelURL: URL) { self.panelURL = panelURL; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "qrNFC")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self; webView.uiDelegate = self
        view = webView
        webView.load(URLRequest(url: panelURL))
    }
    func tearDown() {
        cancelOperation()
        webView.stopLoading()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "qrNFC", contentWorld: .page)
    }
    private func cancelOperation() {
        if let reply = pendingConfirmation {
            pendingConfirmation = nil
            presentedViewController?.dismiss(animated: true)
            reply(nil, "Operación cancelada.")
        }
        nfc.cancel()
    }
    private func trusted(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "https" && url.host == panelURL.host && (url.port ?? 443) == (panelURL.port ?? 443)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url),
              let body = message.body as? [String: Any], let action = body["action"] as? String else {
            replyHandler(nil, "El panel no tiene permiso para acceder a NFC."); return
        }
        if action == "cancel" { cancelOperation(); replyHandler(["written": false, "locked": false], nil); return }
        guard action == "write", let value = body["url"] as? String, let url = URL(string: value),
              trusted(url), url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.range(of: "^/r/[A-Za-z0-9_-]{12}$", options: .regularExpression) != nil else {
            replyHandler(nil, "Solo se pueden grabar enlaces cortos de tu panel."); return
        }
        let lock = body["lock"] as? Bool ?? false
        let overwrite = body["overwrite"] as? Bool ?? false
        guard !nfc.isBusy, presentedViewController == nil else { replyHandler(nil, "Ya hay una operación en curso."); return }
        let alert = UIAlertController(title: lock ? "Grabar y bloquear NFC" : "Grabar NFC", message: value + "\n\n" + (lock ? "El bloqueo es permanente: no podrás volver a escribir esta etiqueta. El destino se puede editar desde el panel." : "Acercá una sola etiqueta al borde superior del iPhone.") + (overwrite ? "\nSe reemplazará el contenido existente." : "\nSolo se grabarán etiquetas vacías."), preferredStyle: .alert)
        pendingConfirmation = replyHandler
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { [weak self] _ in
            let reply = self?.pendingConfirmation; self?.pendingConfirmation = nil
            reply?(nil, "Operación cancelada.")
        })
        alert.addAction(UIAlertAction(title: lock ? "Grabar y bloquear" : "Grabar", style: lock ? .destructive : .default) { [weak self] _ in
            guard let self, let reply = self.pendingConfirmation else { return }
            self.pendingConfirmation = nil
            self.nfc.start(url: url, lock: lock, overwrite: overwrite, reply: reply)
        })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.shouldPerformDownload { decisionHandler(.download); return }
        if url.scheme == "blob" || trusted(url) { decisionHandler(.allow); return }
        if ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
        return nil
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard trusted(frame.request.url), presentedViewController == nil else { completionHandler(false); return }
        let alert = UIAlertController(title: "QR Studio", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Continuar", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showLoadError(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showLoadError(error) }
    private func showLoadError(_ error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled, presentedViewController == nil else { return }
        let alert = UIAlertController(title: "No pudimos abrir el panel", message: "Revisá tu conexión y el dominio configurado.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Reintentar", style: .default) { [weak self] _ in guard let self else { return }; self.webView.load(URLRequest(url: self.panelURL)) })
        alert.addAction(UIAlertAction(title: "Cerrar", style: .cancel))
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let url = directory.appendingPathComponent((suggestedFilename as NSString).lastPathComponent)
            downloads[ObjectIdentifier(download)] = url; completionHandler(url)
        } catch { completionHandler(nil) }
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        share.popoverPresentationController?.sourceView = view
        present(share, animated: true)
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads.removeValue(forKey: ObjectIdentifier(download)); showLoadError(error)
    }
}
