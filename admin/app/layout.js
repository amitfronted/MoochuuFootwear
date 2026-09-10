import { Roboto, Open_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Moochuu India Admin',
  description: 'Moochuu India Admin',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <main className="h-screen bg-slate-50">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
