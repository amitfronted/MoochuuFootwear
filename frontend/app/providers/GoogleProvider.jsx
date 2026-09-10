'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

const GoogleProvider = ({ children }) => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.warn('Google Client ID is missing in environment variables.');
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
};

export default GoogleProvider;
