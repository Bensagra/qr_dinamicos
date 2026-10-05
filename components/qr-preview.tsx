"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type QRCodeStyling from "qr-code-styling";
import type { QRDesign } from "@/lib/qr";
import { qrOptions } from "@/lib/qr-export";
export type QRHandle = {
  download: (extension: "png" | "svg", name: string) => Promise<void>;
};
export const QRPreview = forwardRef<
  QRHandle,
  { data: string; design: QRDesign; size?: number }
>(function QRPreview({ data, design, size = 280 }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<QRCodeStyling | null>(null);
  const [error, setError] = useState(false);
  const { foreground, background, dots, corners, logo } = design;
  useEffect(() => {
    let stopped = false;
    import("qr-code-styling")
      .then(({ default: QRCode }) => {
        if (stopped || !host.current) return;
        const qr = new QRCode(qrOptions(data, { foreground, background, dots, corners, logo }));
        host.current.replaceChildren();
        qr.append(host.current);
        instance.current = qr;
      })
      .catch(() => setError(true));
    return () => {
      stopped = true;
      instance.current = null;
    };
  }, [data, foreground, background, dots, corners, logo]);
  useImperativeHandle(ref, () => ({
    async download(extension, name) {
      if (!instance.current)
        throw new Error("El QR todavía se está generando. Intentá de nuevo.");
      await instance.current.download({ extension, name });
    },
  }));
  return (
    <div
      className="qr-image"
      style={{ width: size, maxWidth: "100%", aspectRatio: "1" }}
      role="img"
      aria-label="Vista previa del código QR"
    >
      {error ? (
        <p role="alert">
          No pudimos generar la vista previa. Recargá la página.
        </p>
      ) : (
        <div ref={host} />
      )}
    </div>
  );
});
