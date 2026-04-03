import Loading from '@components/_core/Loading/Loading';
import DevTools from '@components/_core/DevTools/DevTools';

/**
 * Campaign shell layout.
 * Wraps every game route with the loading overlay and dev tooling.
 * Add persistent UI here (e.g. mute button, progress bar).
 */
export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Loading />
      {children}
      <DevTools />
    </>
  );
}
