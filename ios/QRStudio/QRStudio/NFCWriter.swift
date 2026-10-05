import Foundation
import CoreNFC

final class NFCWriter: NSObject, NFCNDEFReaderSessionDelegate {
    private var session: NFCNDEFReaderSession?
    private var reply: ((Any?, String?) -> Void)?
    private var message: NFCNDEFMessage?
    private var lock = false
    private var overwrite = false
    private var written = false
    private var processing = false
    var isBusy: Bool { reply != nil }

    func start(url: URL, lock: Bool, overwrite: Bool, reply: @escaping (Any?, String?) -> Void) {
        guard !isBusy else { reply(nil, "Ya hay una operación NFC en curso."); return }
        guard NFCNDEFReaderSession.readingAvailable else { reply(nil, "Este iPhone no permite grabar NFC. Usá un iPhone compatible; el simulador no tiene NFC."); return }
        guard let payload = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) else { reply(nil, "Enlace inválido."); return }
        self.reply = reply; self.lock = lock; self.overwrite = overwrite; self.written = false; self.processing = false
        self.message = NFCNDEFMessage(records: [payload])
        let session = NFCNDEFReaderSession(delegate: self, queue: .main, invalidateAfterFirstRead: false)
        self.session = session
        session.alertMessage = "Acercá una sola etiqueta al borde superior del iPhone. No la retires hasta terminar."
        session.begin()
    }
    func cancel() {
        guard let session else { return }
        finish(error: "Operación cancelada. Si acercaste una etiqueta, verificá su contenido antes de volver a intentar.")
        session.invalidate()
    }
    private func finish(locked: Bool = false, error: String? = nil) {
        guard let reply else { return }
        self.reply = nil
        if written {
            var result: [String: Any] = ["written": true, "locked": locked]
            if let error { result["warning"] = "El enlace se grabó, pero no se confirmó el bloqueo. " + error }
            reply(result, nil)
        } else { reply(nil, error ?? "No se pudo grabar la etiqueta.") }
    }
    private func fail(_ text: String) { finish(error: text); session?.invalidate(errorMessage: text) }
    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        guard self.session === session else { return }
        finish(error: "La sesión NFC terminó. Revisá la etiqueta y volvé a intentar.")
        self.session = nil; processing = false
    }
    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {}
    func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard self.session === session, isBusy, !processing else { return }
        guard tags.count == 1, let tag = tags.first else {
            session.alertMessage = "Acercá una sola etiqueta NFC."
            session.restartPolling(); return
        }
        processing = true
        session.connect(to: tag) { [weak self] error in
            guard let self, self.session === session, self.isBusy else { return }
            guard error == nil else { self.fail("No se pudo conectar. Mantené la etiqueta junto al iPhone."); return }
            tag.queryNDEFStatus { status, capacity, error in
                guard self.session === session, self.isBusy else { return }
                guard error == nil, status == .readWrite else { self.fail("La etiqueta está bloqueada o no es compatible con NDEF."); return }
                guard let message = self.message, message.length <= capacity else { self.fail("La etiqueta no tiene espacio suficiente para este enlace."); return }
                tag.readNDEF { current, error in
                    guard self.session === session, self.isBusy else { return }
                    // Empty tags may report ndefReaderSessionErrorZeroLengthMessage.
                    let emptyError = (error as? NFCReaderError)?.code == .ndefReaderSessionErrorZeroLengthMessage
                    guard error == nil || emptyError else { self.fail("No se pudo comprobar el contenido de la etiqueta."); return }
                    let hasContent = current?.records.contains { $0.typeNameFormat != .empty } ?? false
                    guard self.overwrite || !hasContent else { self.fail("La etiqueta ya tiene contenido. Activá Reemplazar contenido si querés sobrescribirlo."); return }
                    tag.writeNDEF(message) { error in
                        guard self.session === session, self.isBusy else { return }
                        guard error == nil else { self.fail("No se confirmó la grabación. Verificá la etiqueta y volvé a intentar."); return }
                        self.written = true
                        if !self.lock {
                            self.finish(); session.alertMessage = "Enlace grabado. Ya podés probar la etiqueta."; session.invalidate(); return
                        }
                        // Lock the same connected tag, never start a second polling session.
                        session.alertMessage = "Enlace grabado. No retires la etiqueta: bloqueando…"
                        tag.writeLock { error in
                            guard self.session === session, self.isBusy else { return }
                            guard error == nil else { self.fail("No se pudo confirmar el bloqueo permanente."); return }
                            self.finish(locked: true); session.alertMessage = "Etiqueta grabada y bloqueada permanentemente."; session.invalidate()
                        }
                    }
                }
            }
        }
    }
}
