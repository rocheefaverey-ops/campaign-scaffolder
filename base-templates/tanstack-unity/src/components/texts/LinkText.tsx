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

export function LinkText({ text, link, target = '_blank', className }: ILinkText) {
  const linkList = link ? Array.isArray(link) ? link : [link] : [];
  const parts = text.split(/(###.*?###)/i);
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
