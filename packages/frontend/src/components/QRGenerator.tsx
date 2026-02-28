import React from "react";
import QRCode from "react-qr-code";

type Props = {
  payload: object | string;
  size?: number;
};

export default function QRGenerator({
  payload,
  size = 256,
}: Props) {
  let value: string;
  
  if (typeof payload === "string") {
    value = payload;
  } else {
    try {
      value = JSON.stringify(payload);
    } catch (e) {
      value = String(payload);
    }
  }

  return (
    <div style={{ padding: 8, background: "white", display: "inline-block" }}>
      <QRCode value={value} size={size} />
    </div>
  );
}
