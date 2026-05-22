import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { StyledButtonVariant } from '~/components/buttons/StyledButton.tsx';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadMenuData } from '~/loaders/MenuLoader.ts';
import LogoImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/menu')({
  component: Menu,
  loader: async ({ context }) => await loadMenuData(context.language),
});

function Menu() {
  const router = useRouter();
  const data = Route.useLoaderData();
  const items = buildItems(data);

  function closeMenu() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void router.navigate({ to: '/landing' });
    }
  }

  function goTo(item: ReturnType<typeof buildItems>[number]) {
    if (item.external) {
      window.location.href = item.target;
      return;
    }
    void router.navigate({ to: item.target as never });
  }

  return (
    <PageContainer className="campaign-screen--menu">
      <div className="campaign-shell">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.3s ease both' }}>
          <div className="campaign-menu-spacer" />
          <img src={data.logoUrl || LogoImage} alt="Logo" className="campaign-menu-logo" />
          <button type="button" className="campaign-close" onClick={closeMenu} aria-label="Close menu">
            <span aria-hidden>x</span>
          </button>
        </header>

        <div className="campaign-panel campaign-panel--strong campaign-menu-panel" style={{ animation: 'fadeIn 0.3s 0.05s ease both' }}>
          <h1 className="campaign-title campaign-title--compact">{data.copy.headline}</h1>
          <div className="campaign-actions">
            {items.map((item) => (
              <StyledButton key={item.copyKey} variant={item.variant} onClick={() => goTo(item)}>
                {data.copy[item.copyKey]}
              </StyledButton>
            ))}
          </div>
        </div>

        <div className="campaign-stack campaign-menu-footer" style={{ animation: 'fadeIn 0.3s 0.1s ease both' }}>
          <div className="divider" />
          <p className="campaign-kicker">Powered by Livewall</p>
        </div>
      </div>
    </PageContainer>
  );
}

function buildItems(data: Awaited<ReturnType<typeof loadMenuData>>) {
  return [
    data.flags.showHome        && { copyKey: 'home',        target: '/landing',           variant: data.variants.home },
    data.flags.showResume      && { copyKey: 'resume',      target: '/game',              variant: data.variants.resume },
    data.flags.showHowToPlay   && { copyKey: 'howToPlay',   target: '/tutorial',          variant: data.variants.howToPlay },
    data.flags.showLeaderboard && { copyKey: 'leaderboard', target: '/leaderboard',       variant: data.variants.leaderboard },
    data.flags.showVoucher     && { copyKey: 'voucher',     target: '/voucher',           variant: data.variants.voucher },
    data.flags.showTerms && data.links.termsUrl     && { copyKey: 'terms',   target: data.links.termsUrl,   external: true, variant: data.variants.terms },
    data.flags.showPrivacy && data.links.privacyUrl && { copyKey: 'privacy', target: data.links.privacyUrl, external: true, variant: data.variants.privacy },
    data.flags.showFaq         && { copyKey: 'faq',         target: '/faq',               variant: data.variants.faq },
    data.flags.showLeave       && { copyKey: 'leave',       target: '/',                  variant: data.variants.leave },
  ].filter(Boolean) as Array<{
    copyKey: keyof Awaited<ReturnType<typeof loadMenuData>>['copy'];
    target: string;
    external?: boolean;
    variant: StyledButtonVariant;
  }>;
}
