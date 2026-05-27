import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadVoucherData } from '~/loaders/VoucherLoader.ts';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';

export const Route = createFileRoute('/voucher')({
  component: VoucherPage,
  loader: async ({ context }) => await loadVoucherData(context.language),
});

const FLOW_RULE = '{{FLOW_RULE_VOUCHER}}';
const SKIP_ROUTE = '{{FLOW_SKIP_VOUCHER}}';
const VOUCHER_VIEWED_KEY = 'lw_voucher_viewed_{{CAPE_ID}}';
const wasVoucherViewed = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(VOUCHER_VIEWED_KEY) === '1';
const markVoucherViewed = () => {
  try { window.localStorage.setItem(VOUCHER_VIEWED_KEY, '1'); } catch { /* private mode */ }
};

function VoucherPage() {
  const { copy, showQr } = Route.useLoaderData();
  const router = useRouter();
  const voucherCode = useUnityStore((state) => state.result?.voucherCode ?? '');

  useEffect(() => {
    const needsVoucher = FLOW_RULE === 'voucher-required' || FLOW_RULE === 'voucher-once';
    if (needsVoucher && !voucherCode) {
      void router.navigate({ to: SKIP_ROUTE as never, replace: true });
      return;
    }
    if (FLOW_RULE === 'voucher-once' && wasVoucherViewed()) {
      void router.navigate({ to: SKIP_ROUTE as never, replace: true });
    }
  }, [router, voucherCode]);

  const goNext = () => {
    if (FLOW_RULE === 'voucher-once') markVoucherViewed();
    void router.navigate({ to: '{{NEXT_AFTER_VOUCHER}}' as never, replace: true });
  };

  const qrUrl = voucherCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(voucherCode)}`
    : null;

  return (
    <PageContainer className="campaign-screen campaign-screen--hero">
      <div className="campaign-hero-shade" aria-hidden />
      <div className="campaign-shell">
        <div className="campaign-hero-content">
          <h1 className="campaign-title">{copy.headline || 'Your Reward'}</h1>
          {copy.body && <p className="campaign-copy">{copy.body}</p>}

          <div className="voucher-block">
            <span className="voucher-block__code">{voucherCode || '——'}</span>
            {showQr && qrUrl && (
              <img src={qrUrl} alt="QR code" className="voucher-block__qr" width={160} height={160} />
            )}
          </div>

          <div className="campaign-actions">
            <StyledButton onClick={goNext}>
              {copy.ctaDone || 'Continue'}
            </StyledButton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
