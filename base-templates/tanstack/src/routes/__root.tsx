import { HeadContent, Outlet, Scripts, createRootRouteWithContext, retainSearchParams, useLoaderData } from '@tanstack/react-router';
import { z } from 'zod';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';
import { ViewContainer } from '~/components/containers/ViewContainer.tsx';
import { loadRootData } from '~/loaders/RootLoader.ts';
import '../globals.scss';
import { DebugDialog } from '~/components/debugger/DebugDialog.tsx';
import { DesignTokenInjector } from '~/components/design-tokens/DesignTokenInjector.tsx';

type RootContext = {
  language: string;
};

const searchSchema = z.object({
  language: z.string().optional(),
});

export const Route = createRootRouteWithContext<RootContext>()({
  search: {
    middlewares: [retainSearchParams(['language'])],
  },
  validateSearch: searchSchema,
  beforeLoad: ({ search, context }): RootContext => ({
    language: search.language?.toUpperCase() || context.language,
  }),
  loader: async ({ context }) => await loadRootData(context.language),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Livewall Campaign',
      },
    ],
    scripts: [
      {
        src: `${loaderData?.unityEnvironment.url}Build/Build.loader.js`,
      },
      {
        children: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${loaderData?.gtmId}');
        `,
      },
    ],
    links: [
      { rel: 'icon',             href: '/favicon.ico',             sizes: 'any' },
      { rel: 'icon',             href: '/assets/favicon.svg',      type: 'image/svg+xml' },
      { rel: 'icon',             href: '/assets/favicon-32.png',   type: 'image/png', sizes: '32x32' },
      { rel: 'icon',             href: '/assets/favicon-192.png',  type: 'image/png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/assets/apple-touch-icon.png', sizes: '180x180' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const data = useLoaderData({ from: '__root__' });
  return (
    <main id="app">
      <DesignTokenInjector branding={data?.branding ?? null} />
      <ViewContainer>
        <Outlet />
      </ViewContainer>
    </main>
  );
}

function RootDocument({ children }: IDefaultProps) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}

        <DebugDialog />
        <Scripts />
      </body>
    </html>
  );
}
