import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadVoucherData } from '~/loaders/VoucherLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';

export const Route = createFileRoute('/voucher')({
  component: VoucherPage,
  loader: async ({ context }) => await loadVoucherData(context.language),
});

function VoucherPage() {
  const { copy, showQr } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const voucherCode = useUnityStore((state) => state.result?.voucherCode ?? '');

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
            <StyledButton onClick={navigate}>
              {copy.ctaDone || 'Done'}
            </StyledButton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
