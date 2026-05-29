import styles from './FooterLinkList.module.scss';

type Link = { label: string; href: string };
type Props = { links: Link[] };

export function FooterLinkList({ links }: Props) {
  if (!links?.length) return null;
  return (
    <ul className={styles.list}>
      {links.map((l, i) => (
        <li key={i}>
          <a href={l.href} className={styles.link}>{l.label}</a>
        </li>
      ))}
    </ul>
  );
}
