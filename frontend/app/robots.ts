import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.APP_ENV === 'production';
  return {
    rules: [
      {
        userAgent: '*',
        allow: isProduction ? '/' : '',
        disallow: isProduction ? '' : '/'
      }
    ],
    sitemap: isProduction ? 'https://example/sitemap.xml' : undefined
  };
}
