'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import ThemeProvider from '../context/ThemeProvider';
import ThemeRegistry from '../ThemeRegistry';
import GoogleProvider from '../providers/GoogleProvider';
import CartProvider from '../context/CartContext';
import OrderProvider from '../context/OrderContext';

const Providers = ({ children }) => {
  return (
    <ThemeRegistry>
      <GoogleProvider>
        <AuthProvider>
          <ThemeProvider>
            <CartProvider>
              <OrderProvider>{children}</OrderProvider>

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                }}
              />
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
      </GoogleProvider>
    </ThemeRegistry>
  );
};

export default Providers;
