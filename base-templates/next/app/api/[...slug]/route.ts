/**
 * app/api/[...slug]/route.ts
 *
 * Mock API catch-all — only active when API_MOCK=true.
 *
 * How it works:
 *   Set API_URL=http://localhost:3000 in your .env (or use .env.mock).
 *   All server actions call ${API_URL}/api/... which hits this route.
 *   Real requests never reach an external backend — useful for local dev
 *   before the backend exists or is accessible.
 *
 * In production: API_MOCK is not set → every request returns 404.
 */

import { type NextRequest, NextResponse } from 'next/server';

// ── Guard ─────────────────────────────────────────────────────────────────────

function mockDisabled() {
  return NextResponse.json(
    { error: 'Mock API not enabled. Set API_MOCK=true in .env.' },
    { status: 404 },
  );
}

// ── Stable mock data ──────────────────────────────────────────────────────────

const MOCK_TOKEN      = 'mock-token-dev-local-only';
const MOCK_USER_ID    = 'mock-user-00000001';
const MOCK_SESSION_ID = 'mock-session-00000001';

// Ten plausible Dutch names for the leaderboard
const LEADERBOARD_NAMES = [
  'Sophie de Vries',
  'Lars Bakker',
  'Emma Visser',
  'Thomas van den Berg',
  'Lisa Janssen',
  'Daan Meijer',
  'Julia Smit',
  'Noah de Groot',
  'Mila Mulder',
  'Finn van Dijk',
];

function buildLeaderboard() {
  const entries = LEADERBOARD_NAMES.map((name, i) => ({
    rank:            i + 1,
    name,
    // Decreasing scores so the list is realistic
    score:           9999 - i * 712,
    isCurrentPlayer: false,
  }));

  // Always insert the current player at rank 4 so the UI shows the
  // "personal best" highlight without having to end a real session.
  entries.splice(3, 0, {
    rank:            4,
    name:            'Jij (mock)',
    score:           6575,
    isCurrentPlayer: true,
  });

  return entries
    .slice(0, 10)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  if (process.env.API_MOCK !== 'true') return mockDisabled();

  const { slug } = await context.params;
  const path = slug.join('/');

  // GET /api/leaderboard?type=total&limit=10&offset=0
  if (path === 'leaderboard') {
    const entries = buildLeaderboard();
    return json({
      entries,
      personalBest: entries.find(e => e.isCurrentPlayer) ?? null,
      total:        entries.length,
    });
  }

  return json({ error: `[mock] No GET handler for: /${path}` }, 404);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  if (process.env.API_MOCK !== 'true') return mockDisabled();

  const { slug } = await context.params;
  const path = slug.join('/');

  // POST /api/authenticate
  if (path === 'authenticate') {
    return json({
      token:                MOCK_TOKEN,
      userId:               MOCK_USER_ID,
      onboardingCompleted:  false,
      alreadyRegistered:    false,
      campaign: {
        status:   'active' as const,
        startsAt: new Date(Date.now() - 86_400_000).toISOString(),
        endsAt:   new Date(Date.now() + 86_400_000 * 30).toISOString(),
      },
    });
  }

  // POST /api/sessions/create
  if (path === 'sessions/create') {
    return json({
      sessionId: MOCK_SESSION_ID,
      startedAt: new Date().toISOString(),
    });
  }

  // POST /api/onboarding/complete  (some stacks use POST)
  if (path === 'onboarding/complete') {
    return json({ success: true });
  }

  return json({ error: `[mock] No POST handler for: /${path}` }, 404);
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  if (process.env.API_MOCK !== 'true') return mockDisabled();

  const { slug } = await context.params;
  const path = slug.join('/');

  // PUT /api/users/register
  if (path === 'users/register') {
    return json({ success: true, userId: MOCK_USER_ID });
  }

  // PUT /api/sessions/end/:sessionId
  if (path.startsWith('sessions/end/')) {
    return json({
      rank:              4,
      highscore:         6575,
      alreadyRegistered: false,
    });
  }

  // PUT /api/onboarding/complete  (some stacks use PUT)
  if (path === 'onboarding/complete') {
    return json({ success: true });
  }

  return json({ error: `[mock] No PUT handler for: /${path}` }, 404);
}
