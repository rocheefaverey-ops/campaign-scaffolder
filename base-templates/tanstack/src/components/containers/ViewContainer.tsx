import { QRCodeSVG } from 'qrcode.react';
import { useLoaderData } from '@tanstack/react-router';
import styles from './ViewContainer.module.scss';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import VisualImage from '~/assets/images/logo.png';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { SmartImage } from '~/components/visuals/SmartImage.tsx';
import { AuthProvider } from '~/components/contexts/AuthContext.tsx';
import { UnityProvider } from '~/components/game/UnityContext.tsx';

export function ViewContainer({ children }: IDefaultProps) {
  const { copy, logoPlaceholder, baseUrl } = useLoaderData({ from: '__root__' });

  return (
    <div className={styles.viewContainer}>
      <div className={styles.contentBlock}>
        <div className={mergeClasses(styles.container, styles.left)}>
          <SmartImage src={VisualImage} alt={'logo'} width={120} aspectRatio={1} placeholder={logoPlaceholder} />
          <StyledText className={styles.desktopCopy} type={'description'}>{copy.desktop.description}</StyledText>
        </div>
      </div>

      <div className={styles.viewFrame}>
        <AuthProvider>
          <UnityProvider>
            {children}
          </UnityProvider>
        </AuthProvider>
      </div>

      <div className={styles.contentBlock}>
        <div className={mergeClasses(styles.container, styles.right)}>
          <div className={styles.qrWrapper}>
            <QRCodeSVG value={baseUrl} size={96} />
          </div>
          <StyledText className={styles.qrCopy} type={'description'}>{copy.desktop.qrText}</StyledText>
        </div>
      </div>
    </div>
  );
}
