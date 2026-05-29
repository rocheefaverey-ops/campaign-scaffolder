import styles from './BodyCopy.module.scss';

type Props = {
  text?: string;
};

export function BodyCopy({ text }: Props) {
  if (!text) return null;
  return <p className={styles.copy}>{text}</p>;
}
