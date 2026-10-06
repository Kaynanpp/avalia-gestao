import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { PRODUCT, COMPANY_BRAND } from '@/lib/product';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT.name} — Lideranças e Colegas`,
    template: `%s | ${PRODUCT.name}`,
  },
  description:
    'Plataforma interna para avaliar lideranças e colegas de setor, com acompanhamento pelo RH/DP.',
  robots: 'noindex, nofollow', // Internal system - not for public indexing
  icons: { icon: COMPANY_BRAND.generic ? '/brand/avalia-gestao.svg' : '/brand/atalaia-mark.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            theme="system"
            toastOptions={{
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
