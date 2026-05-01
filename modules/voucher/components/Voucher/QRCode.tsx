'use client';

/**
 * QRCode — renders a QR code for the voucher code.
 *
 * Requires: npm install next-qrcode
 * Uncomment the import below after installing.
 */

// import { useQRCode } from 'next-qrcode';

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 200 }: Props) {
  // const { SVG } = useQRCode();
  // return <SVG text={value} options={{ width: size }} />;

  // Placeholder until next-qrcode is installed:
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg border border-dashed border-current opacity-30"
    >
      <span className="text-xs">QR: {value}</span>
    </div>
  );
}
