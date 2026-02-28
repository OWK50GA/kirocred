import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onResult: (data: object | string) => void;
  onError?: (err: any) => void;
  fps?: number;
  qrbox?: number;
  id?: string;
};

export default function QRScanner({
  onResult,
  onError,
  fps = 10,
  qrbox = 250,
  id = "qr-scanner",
}: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let mounted = true;
    const html5QrCode = new Html5Qrcode(id);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps, qrbox },
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            onResult(parsed);
          } catch {
            // Not JSON — return raw string
            onResult(decodedText);
          }
        },
        (errorMessage) => {
          // optional per-frame parse errors
        }
      )
      .catch((err) => {
        if (mounted && onError) onError(err);
      });

    return () => {
      mounted = false;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
  }, [id, fps, qrbox, onResult, onError]);

  return <div id={id} style={{ width: qrbox, height: qrbox }} />;
}
