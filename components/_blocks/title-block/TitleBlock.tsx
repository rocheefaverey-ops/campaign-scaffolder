import styles from './TitleBlock.module.scss';

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export function TitleBlock({ kicker, title, subtitle }: Props) {
  return (
    <div className={`${styles.titleBlock} campaign-stack`}>
      {kicker && <div className={`${styles.kicker} campaign-kicker`}>{kicker}</div>}
      <h1 className={`${styles.title} campaign-title`}>{title}</h1>
      {subtitle && <p className={`${styles.subtitle} campaign-copy`}>{subtitle}</p>}
    </div>
  );
}
