import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rivl — Outbuild Any Product in 90 Seconds',
  description: 'Paste any URL. AI analyzes the weaknesses. Deploys a better version. Live.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Rivl',
    description: 'Outbuild any product in 90 seconds.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
