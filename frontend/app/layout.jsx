import localFont from 'next/font/local';
import './globals.css';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Providers from './components/Providers';

const hostGrotesk = localFont({
  src: [
    {
      path: '../public/fonts/host-grotesk-v5-latin-300.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/host-grotesk-v5-latin-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/host-grotesk-v5-latin-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/host-grotesk-v5-latin-600.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/host-grotesk-v5-latin-700.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/host-grotesk-v5-latin-800.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-host-grotesk',
});

const rockSalt = localFont({
  src: '../public/fonts/rock-salt-latin-regular.woff2',
  variable: '--font-rock-salt',
  weight: '400',
  style: 'normal',
});

export const metadata = {
  title: 'Moochuu Footwear',
  description: 'Cutom footwear collection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hostGrotesk.variable} ${rockSalt.variable}`}>
      <body className="min-h-screen antialiased overflow-x-hidden">
        <Providers>
          <Header />

          <main className="bg-[#fdea07] md:mt-[88px] mt-[72px] min-h-screen">
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}
