import type { Metadata } from 'next';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIR Credential – Sign login message',
  description: 'Sign the login message for AIR Credential MCP. No private key is sent.',
};

import { Providers } from './Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
