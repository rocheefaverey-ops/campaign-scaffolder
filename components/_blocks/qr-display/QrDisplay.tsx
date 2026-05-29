import styles from './QrDisplay.module.scss';

type Props = {
  value?: string;
  instructions?: string;
};

export function QrDisplay({ value = '', instructions }: Props) {
  const src = value ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}` : '';
  return (
    <div className={styles.wrap}>
      {instructions && <p>{instructions}</p>}
      {src ? <img src={src} alt="QR code" /> : <div className={styles.placeholder}>QR</div>}
    </div>
  );
}
