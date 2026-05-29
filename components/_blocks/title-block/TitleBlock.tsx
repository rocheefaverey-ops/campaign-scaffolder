import styles from './TitleBlock.module.scss';

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export function TitleBlock({ kicker, title, subtitle }: Props) {
  return (
    <div className={styles.titleBlock}>
      {kicker && <div className={styles.kicker}>{kicker}</div>}
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
