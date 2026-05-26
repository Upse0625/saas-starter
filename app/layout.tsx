import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'SaaS Starter — Multi-tenant SaaS, fully wired',
  description:
    'Auth, billing, team management, and multi-tenancy — pre-wired into a polished foundation for your next SaaS product.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
