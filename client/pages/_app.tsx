import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation } from 'next-i18next';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/useAuthStore';
import { authAPI } from '@/lib/api';
import '@/styles/globals.css';
import '@/styles/print.css';
import '@/styles/animations.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App({ Component, pageProps }: AppProps) {
  const { setUser, setInitialized, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Initialize user session
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      }
      // Mark auth as initialized
      setInitialized(true);
    };

    initAuth();
  }, [setUser, setInitialized]);

  // Set language direction
  useEffect(() => {
    setMounted(true);
    const isUrdu = router.locale === 'ur';
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.documentElement.lang = router.locale || 'en';
  }, [router.locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      {mounted && (
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
}

export default appWithTranslation(App);
