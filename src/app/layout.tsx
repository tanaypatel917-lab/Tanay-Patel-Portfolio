import type { Metadata } from 'next';
import { AppShell } from '@/components/shared/AppShell';
import { portfolioContent } from '@/content/portfolio';
import './fonts.css';
import './globals.css';

const title = `${portfolioContent.identity.name} | ${portfolioContent.identity.role}`;
const description = portfolioContent.intro.summary;
let metadataBase: URL | undefined;
try {
  const configured = process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined;
  if (configured?.protocol === 'https:' && !configured.username && !configured.password) metadataBase = configured;
} catch {}

export const metadata: Metadata = {
  title,
  description,
  applicationName: portfolioContent.identity.name,
  ...(metadataBase ? { metadataBase, alternates: { canonical: '/' } } : {}),
  openGraph: {
    type: 'website',
    title,
    description,
    ...(metadataBase ? { images: [{ url: '/images/portfolio-social.png', width: 1200, height: 630, alt: `Portrait and portfolio of ${portfolioContent.identity.name}` }] } : {}),
  },
  twitter: {
    card: metadataBase ? 'summary_large_image' : 'summary',
    title,
    description,
    ...(metadataBase ? { images: ['/images/portfolio-social.png'] } : {}),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Semantic content remains visible without JavaScript or animation. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}.hero__line-inner{translate:none!important}.hero__counter{display:none!important}.dither-fallback{opacity:1!important}`}</style>
        </noscript>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
