'use client';

/**
 * [module: voucher]
 * Install: npm install next-qrcode
 * Then uncomment the import below and replace the placeholder.
 */

// import { useQRCode } from 'next-qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 160 }: QRCodeProps) {
  // const { Canvas } = useQRCode();
  // return <Canvas text={value} options={{ width: size }} />;

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg bg-white/10 text-xs text-white/30"
    >
      QR: {value.slice(0, 12)}…
    </div>
  );
}
