import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/frontend/components/ui/toaster';
import { ThemeProvider } from '@/frontend/components/theme-provider';
import { SessionProvider } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Global HRM Network (GHRMN)',
  description: 'Global HR Network Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans h-full antialiased`}>
        <SessionProvider>
          <ThemeProvider
              attribute="class"
              defaultTheme="emerald-green"
              enableSystem
              disableTransitionOnChange
          >
              {children}
              <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
