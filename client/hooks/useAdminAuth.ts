import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Custom hook to protect admin routes
 * Redirects to login if not authenticated or not an admin
 */
export function useAdminAuth() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Wait for auth state to be initialized
    const token = localStorage.getItem('accessToken');
    
    // If no token and not authenticated, redirect to login
    if (!token && !isAuthenticated) {
      const currentPath = router.asPath;
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // If authenticated but not a superadmin, redirect to home
    if (isAuthenticated && user && user.role !== 'superadmin') {
      router.replace('/');
      return;
    }
  }, [user, isAuthenticated, router]);

  // Return loading state if we're still checking auth
  const isLoading = !isAuthenticated || !user || user.role !== 'superadmin';
  
  return { user, isAuthenticated, isLoading };
}
