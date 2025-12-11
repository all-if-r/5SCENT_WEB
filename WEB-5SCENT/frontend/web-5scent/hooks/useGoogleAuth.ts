'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GoogleAuthResponse {
  token: string;
  user: {
    user_id: number;
    name: string;
    email: string;
    profile_pic?: string;
  };
}

interface GoogleError {
  error: string;
  message?: string;
  details?: string;
}

/**
 * Hook to handle Google OAuth sign-in and registration
 * 
 * Usage:
 * const { renderGoogleButton, googleClientId } = useGoogleAuth(
 *   (token, user) => {
 *     localStorage.setItem('token', token);
 *     router.push('/dashboard');
 *   }
 * );
 * 
 * In component:
 * useEffect(() => {
 *   renderGoogleButton('button-container-id');
 * }, []);
 */
export const useGoogleAuth = (
  onSuccess?: (token: string, user: any) => void,
  onError?: (error: GoogleError) => void
) => {
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
      return;
    }

    // Load Google Identity Services script
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      // Script already loaded
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script, keep it for later use
    };
  }, [googleClientId]);

  const handleCredentialResponse = async (response: any) => {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Get API URL from environment or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      // Send credential to Laravel backend
      const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const error = data as GoogleError;
        onError?.({
          error: error.message || error.error || 'Google login failed',
          details: error.details,
        });
        throw new Error(error.message || error.error || 'Google login failed');
      }

      const authData = data as GoogleAuthResponse;

      // Call success callback
      if (onSuccess) {
        onSuccess(authData.token, authData.user);
      } else {
        // Default behavior: store token and redirect
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
        router.push('/');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Google login error:', errorMessage);
      onError?.({
        error: 'Authentication failed',
        details: errorMessage,
      });
    }
  };

  const renderGoogleButton = (containerId: string, options?: any) => {
    if (!(window as any).google?.accounts?.id) {
      // Don't throw error, just return - the caller will retry
      return false;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id "${containerId}" not found`);
      return false;
    }

    try {
      (window as any).google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 'wide',
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Error rendering Google button:', error);
      return false;
    }
  };

  return {
    renderGoogleButton,
    googleClientId,
  };
};
