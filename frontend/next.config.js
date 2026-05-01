/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const { i18n } = require('./i18nConfig');

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

let nextConfig = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });
    const rules = config.module.rules.find((rule) => typeof rule.oneOf === 'object').oneOf.filter((rule) => Array.isArray(rule.use));

    rules.forEach((rule) => {
      rule.use.forEach((moduleLoader) => {
        if (/css-loader[/\\](?:cjs|dist|src)/.test(moduleLoader.loader)) {
          if (typeof moduleLoader.options.modules === 'object') {
            moduleLoader.options.modules = {
              ...moduleLoader.options.modules,
              exportLocalsConvention: 'camelCase' // https://github.com/webpack-contrib/css-loader#exportlocalsconvention
            };
          }
        }
      });
    });

    return config;
  },
  i18n,
  reactStrictMode: true,

  images: {
    domains: []
  },

  async headers() {
    return process.env.APP_ENV === 'development'
      ? []
      : [
          {
            // Apply these headers to all routes in your application.
            source: '/:path*',
            headers: securityHeaders
          }
        ];
  },

  // Enables scroll restoration when you go back to previous page
  experimental: {
    scrollRestoration: true
  }
};

// Check if ANALYZE env is set en if true start bundle-analyzer
const analyzeBundles = process.env.ANALYZE;

if (analyzeBundles) {
  const withNextBundleAnalyzer = require('@next/bundle-analyzer')();
  nextConfig = withNextBundleAnalyzer(nextConfig);
}

module.exports = nextConfig;
