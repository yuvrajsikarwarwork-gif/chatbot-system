import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';

export const useAuthGuard = (requiredRole?: 'user' | 'admin' | 'super_admin') => {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // ✅ RBAC Enforcement
    if (requiredRole && user) {
      const roleWeights = { user: 1, admin: 2, super_admin: 3 };
      if (roleWeights[user.role] < roleWeights[requiredRole]) {
        router.push('/dashboard'); // Redirect if insufficient permissions
      }
    }
  }, [isAuthenticated, user, router, requiredRole]);

  return { user, isAuthenticated: isAuthenticated() };
};