import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import './globals.css';

// ─────────────────────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────────────────────

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

// ─────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'Vela - Your Personal Entertainment Universe',
    template: '%s | Vela',
  },
  description:
    'A next-generation streaming platform. Movies, TV series, anime - all in one place.',
  keywords: ['streaming', 'movies', 'tv shows', 'anime', 'watch', 'vela'],
  authors: [{ name: 'Vela Team' }],
  creator: 'Vela',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vela',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Vela',
    title: 'Vela - Your Personal Entertainment Universe',
    description: 'A next-generation streaming platform. Movies, TV series, anime - all in one place.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vela - Your Personal Entertainment Universe',
    description: 'A next-generation streaming platform. Movies, TV series, anime - all in one place.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e50914',
  viewportFit: 'cover',
};

// ─────────────────────────────────────────────────────────────
// Root Layout
// ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
