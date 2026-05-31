import { useState } from 'react';
import styles from './CodeBox.module.scss';

type Props = {
  code?: string;
  label?: string;
  copiedLabel?: string;
};

export function CodeBox({ code = '', label = 'Code', copiedLabel = 'Copied' }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" className={styles.box} onClick={copy}>
      <span className={styles.label}>{label}</span>
      <strong>{code || '------'}</strong>
      <span className={styles.hint}>{copied ? copiedLabel : 'Tap to copy'}</span>
    </button>
  );
}
