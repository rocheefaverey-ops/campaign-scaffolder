import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import styles from './leaderboard.module.scss';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadLeaderboardData } from '~/loaders/LeaderboardLoader.ts';
import LogoImage from '~/assets/images/logo.png';

type TabKey = 'weekly' | 'monthly' | 'total';

interface ILeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

// TODO: replace with real API once the backend leaderboard endpoint is wired up.
const MOCK_ENTRIES: Record<TabKey, ILeaderboardEntry[]> = {
  weekly: [
    { rank: 1, name: 'Sanne', score: 9820 },
    { rank: 2, name: 'Milan', score: 9410 },
    { rank: 3, name: 'Yara', score: 9105 },
    { rank: 4, name: 'Daan', score: 8730 },
    { rank: 5, name: 'Fenna', score: 8520 },
  ],
  monthly: [
    { rank: 1, name: 'Bram', score: 38420 },
    { rank: 2, name: 'Sanne', score: 36180 },
    { rank: 3, name: 'Liam', score: 35970 },
    { rank: 4, name: 'Noor', score: 34110 },
    { rank: 5, name: 'Milan', score: 33240 },
  ],
  total: [
    { rank: 1, name: 'Liam', score: 184320 },
    { rank: 2, name: 'Bram', score: 172940 },
    { rank: 3, name: 'Sanne', score: 168410 },
    { rank: 4, name: 'Yara', score: 154880 },
    { rank: 5, name: 'Milan', score: 149230 },
  ],
};

const MOCK_PERSONAL: ILeaderboardEntry = { rank: 27, name: 'You', score: 6420 };

export const Route = createFileRoute('/leaderboard')({
  component: Leaderboard,
  loader: async ({ context }) => await loadLeaderboardData(context.language),
});

function Leaderboard() {
  const { copy, backgroundUrl, logoUrl } = Route.useLoaderData();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('weekly');
  const entries = MOCK_ENTRIES[activeTab];
  const personal = MOCK_PERSONAL;
  const isLoading = false;
  const isVideoBg = !!backgroundUrl && /\.(mp4|webm|mov)$/i.test(backgroundUrl);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'weekly', label: copy.tabWeekly },
    { key: 'monthly', label: copy.tabMonthly },
    { key: 'total', label: copy.tabTotal },
  ];

  return (
    <PageContainer className="campaign-screen--hero">
      {backgroundUrl && (
        isVideoBg
          ? <video src={backgroundUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
          : <img src={backgroundUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      )}
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
          <img src={logoUrl || LogoImage} alt="Logo" className="campaign-hero-logo" />
          <button type="button" className="campaign-close" onClick={() => router.history.back()} aria-label="Back">
            <span aria-hidden>x</span>
          </button>
        </header>

        <div className="campaign-stack campaign-hero-content" style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}>
          <h1 className="campaign-title">{copy.title}</h1>
          {copy.subline && <p className="campaign-copy">{copy.subline}</p>}

          <div className={styles.tabs} role="tablist">
            {tabs.map((tab, index) => (
              <Fragment key={tab.key}>
                {index > 0 && <div className={styles.tabDivider} aria-hidden />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              </Fragment>
            ))}
          </div>

          <div className={styles.list}>
            {isLoading && <p className={styles.loading}>{copy.loading}</p>}
            {!isLoading && entries.length === 0 && <p className={styles.empty}>{copy.empty}</p>}
            {personal && (
              <div className={`${styles.entry} ${styles.entryPersonal}`}>
                <div className={styles.entryUser}>
                  <span className={styles.entryRank}>{personal.rank}</span>
                  <span className={styles.entryName}>{personal.name}</span>
                </div>
                <span>{personal.score}</span>
              </div>
            )}
            {entries.map((entry) => (
              <div key={entry.rank} className={styles.entry}>
                <div className={styles.entryUser}>
                  <span className={styles.entryRank}>{entry.rank}</span>
                  <span className={styles.entryName}>{entry.name}</span>
                </div>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}>
          <StyledButton onClick={() => router.navigate({ to: '{{NEXT_AFTER_LEADERBOARD}}' as never, replace: true })}>
            {copy.buttonPlayAgain}
          </StyledButton>
          <StyledButton alternate onClick={() => router.navigate({ to: '{{FLOW_ENTRY}}' as never, replace: true })}>
            {copy.buttonHome}
          </StyledButton>
        </div>
      </div>
    </PageContainer>
  );
}
