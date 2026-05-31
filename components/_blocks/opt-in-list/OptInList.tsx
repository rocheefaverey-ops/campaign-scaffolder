import styles from './OptInList.module.scss';

type Props = { optIns?: string[]; required?: boolean };

export function OptInList({ optIns = ['terms'], required = true }: Props) {
  if (!optIns.length) return null;
  return (
    <div className={styles.list}>
      {optIns.map((optIn) => (
        <label key={optIn}>
          <input type="checkbox" required={required && optIn !== 'marketing'} />
          <span>{labelFor(optIn)}</span>
        </label>
      ))}
    </div>
  );
}

function labelFor(optIn: string) {
  const labels: Record<string, string> = {
    terms: 'I agree to the terms and conditions.',
    age18: 'I confirm I am 18 or older.',
    age21: 'I confirm I am 21 or older.',
    marketing: 'I want to receive marketing updates.',
    custom: 'I agree.',
  };
  return labels[optIn] ?? optIn;
}
