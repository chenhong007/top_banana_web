'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Hook to check authentication status
 * Works in both static and dynamic deployment modes
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setAuthState({
          isAuthenticated: data.authenticated,
          isLoading: false,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      // API not available (static export mode)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      });
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    ...authState,
    logout,
    refresh: checkAuth,
  };
}

