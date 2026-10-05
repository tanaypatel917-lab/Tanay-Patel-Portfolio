/** @type {import('next').NextConfig} */
// Set by the GitHub Pages workflow (e.g. "/Tanay-Patel-Portfolio"); empty for local and server deploys.
const basePath = process.env.PAGES_BASE_PATH ?? '';
const staticExport = process.env.STATIC_EXPORT === 'true';

const immutable = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    unoptimized: true,
  },
  ...(staticExport
    ? { output: 'export', trailingSlash: true }
    : {
        async headers() {
          return ['/models/:path*', '/sounds/:path*', '/textures/:path*'].map((source) => ({ source, headers: immutable }));
        },
      }),
};

module.exports = nextConfig;
