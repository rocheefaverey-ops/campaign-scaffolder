/**
 * cli/tanstack-page-builder.js
 *
 * Route constants for the TanStack stack. Page composition is block-driven
 * via tanstack-block-page-builder.js; this file only holds the page list and
 * default route map used by scaffold.js for routeMap construction.
 */

export const TS_ALL_PAGES = ['loading', 'landing', 'tutorial', 'game', 'register', 'result', 'leaderboard', 'voucher', 'end', 'intro-video', 'loading-video', 'ad-video', 'howto-play', 'menu'];

export const TS_PAGE_ROUTES = {
  loading:         '/loading',
  landing:         '/landing',
  tutorial:        '/tutorial',
  game:            '/game',
  register:        '/register',
  result:          '/result',
  leaderboard:     '/leaderboard',
  voucher:         '/voucher',
  end:             '/end',
  'intro-video':   '/intro-video',
  'loading-video': '/loading-video',
  'ad-video':      '/ad-video',
  'howto-play':    '/howto-play',
  menu:            '/menu',
};
