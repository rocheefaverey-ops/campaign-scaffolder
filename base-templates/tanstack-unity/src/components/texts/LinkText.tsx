import styles from './LinkText.module.scss';
import type { HTMLAttributeAnchorTarget } from 'react';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

interface ILinkText extends IStyledProps {
  text: string;
  link?: Array<string> | string;
  target?: HTMLAttributeAnchorTarget;
}

// Legacy CAPE copy may contain raw `<a href="...">label</a>` markup. Normalise it
// to the `###label###` placeholder format so the parser below renders it as a link
// (using either the inline href, or the corresponding entry from `link` if any).
const ANCHOR_RE = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

export function LinkText({ text, link, target = '_blank', className }: ILinkText) {
  const inlineHrefs: string[] = [];
  const normalised = text.replace(ANCHOR_RE, (_, href: string, label: string) => {
    inlineHrefs.push(href);
    return `###${label}###`;
  });

  const explicitLinks = link ? (Array.isArray(link) ? link : [link]) : [];
  const linkList = explicitLinks.length > 0 ? explicitLinks : inlineHrefs;
  const parts = normalised.split(/(###.*?###)/i);
  let linkIndex = 0;

  return (
    <StyledText className={mergeClasses(styles.linkText, className)} type={'description'} alignment={'left'} alternate>
      {parts.map((part, index) => {
        if (part.startsWith('###') && part.endsWith('###')) {
          const linkText = part.slice(3, -3);
          const href = linkList[linkIndex++];

          if (href) {
            return <a key={index} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>{linkText}</a>;
          }
          return <span key={index}>{linkText}</span>;
        }
        return <span key={index}>{part}</span>;
      })}
    </StyledText>
  );
}
