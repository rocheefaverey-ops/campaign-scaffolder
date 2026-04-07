'use client';

import { usePathname, useRouter } from 'next/navigation';
import Header from '@components/_core/Header/Header';
import Loading from '@components/_core/Loading/Loading';
import DevTools from '@components/_core/DevTools/DevTools';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeImage, getHeaderConfig } from '@utils/getCapeData';

// Pages that manage their own header / need full-bleed layout
const PAGES_WITHOUT_HEADER = ['/gameplay', '/video', '/menu'];

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  const pathname            = usePathname();
  const router              = useRouter();
  const { capeData }        = useCapeData();
  const headerConfig        = getHeaderConfig(capeData);
  const showHeader          = headerConfig.enabled && !PAGES_WITHOUT_HEADER.includes(pathname);

  const logoUrl    = getCapeImage(capeData, 'settings.branding.favicon') || getCapeImage(capeData, 'general.header.logo');
  const menuBtnUrl = getCapeImage(capeData, 'general.header.menuBtnBg');
  const menuIconUrl= getCapeImage(capeData, 'general.header.menuIcon');

  return (
    <div className="h-full flex flex-col bg-black">
      {showHeader && (
        <Header
          variant={headerConfig.variant}
          showLogo={headerConfig.showLogo}
          showMenuButton={headerConfig.showMenuButton}
          onMenuClick={() => router.push('/menu')}
          logo={
            logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" className="h-10 w-[122px] object-contain" />
              : null
          }
          menuButton={
            menuIconUrl
              ? (
                <div className="relative size-10 overflow-clip">
                  {menuBtnUrl && <img src={menuBtnUrl} alt="" className="absolute inset-0 size-10" />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={menuIconUrl} alt="" className="absolute left-2 top-2 size-6" />
                </div>
              )
              : <span className="text-white text-xl">☰</span>
          }
        />
      )}

      <main className={`flex-1 min-h-0 overflow-hidden ${showHeader ? '' : 'h-full'}`}>
        <Loading />
        {children}
      </main>

      <DevTools />
    </div>
  );
}
