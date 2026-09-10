'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

const ThemeRegistry = ({ children }) => {
  return <AppRouterCacheProvider>{children}</AppRouterCacheProvider>;
};

export default ThemeRegistry;
