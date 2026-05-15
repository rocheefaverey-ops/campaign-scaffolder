import { Link, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import type { MouseEventHandler } from 'react';
import type { IFullProps } from '~/interfaces/IComponentProps.ts';
import { StyledSpinner } from '~/components/StyledSpinner.tsx';

export interface IBaseButton extends IFullProps {
  loading?: boolean;
  marginTop?: number;
  marginBottom?: number;
  skipPreload?: boolean;
  linkOptions?: LinkProps;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
}

export function BaseButton({ loading, marginTop, marginBottom, skipPreload, linkOptions, onClick, className, children }: IBaseButton) {
  const router = useRouter();

  // Preload, if linkOptions provided
  useEffect(() => {
    if (linkOptions && !skipPreload) {
      void router.preloadRoute(linkOptions);
    }
  }, [linkOptions, skipPreload]);

  // Return link or button, based on linkOptions
  if (linkOptions) {
    return (
      <Link {...linkOptions} replace={linkOptions.replace !== undefined ? linkOptions.replace : true} className={className} style={{ marginTop, marginBottom }} disabled={loading} onClick={onClick}>
        {loading ?
          <StyledSpinner color={'primary'} small />
          :
          <>{children}</>
        }
      </Link>
    );
  } else {
    return (
      <button className={className} style={{ marginTop, marginBottom }} disabled={loading} onClick={onClick}>
        {loading ?
          <StyledSpinner color={'primary'} small />
          :
          <>{children}</>
        }
      </button>
    );
  }
}
