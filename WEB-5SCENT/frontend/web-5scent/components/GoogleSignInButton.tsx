'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  onSuccess?: (token: string, user: any) => void;
}

/**
 * Google Sign-In Button Component
 * 
 * Renders a Google Sign-In button with automatic token handling
 * 
 * Props:
 * - mode: 'signin' (default) for login, 'signup' for registration
 * - onSuccess: Optional callback when login succeeds (otherwise redirects to home)
 * 
 * Usage:
 * <GoogleSignInButton mode="signin" />
 * <GoogleSignInButton mode="signup" onSuccess={(token, user) => console.log(user)} />
 */
export default function GoogleSignInButton({
  mode = 'signin',
  onSuccess,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isClickable, setIsClickable] = useState(false);
  const buttonContainerId = `google-signin-button-${mode}`;
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const { renderGoogleButton, googleClientId } = useGoogleAuth(
    (token, user) => {
      // Store authentication data (use 'token' as per AuthContext)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update AuthContext immediately so navbar reflects changes without page refresh
      updateUser(user);

      if (onSuccess) {
        onSuccess(token, user);
      } else {
        showToast(`Welcome, ${user.name}!`, 'success');
        // Redirect to home page after short delay with refresh
        setTimeout(() => {
          router.refresh();
          router.push('/');
        }, 500);
      }
    },
    (error) => {
      setIsLoading(false);
      showToast(error.details || error.error || 'Google sign-in failed', 'error');
    }
  );

  const getButtonText = () => {
    return mode === 'signup' ? 'Sign Up With Google' : 'Continue with Google';
  };

  const handleCustomButtonClick = async () => {
    if (!(window as any).google?.accounts?.id) {
      showToast('Google authentication is not ready', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Trigger the Google One Tap or OAuth flow
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: show standard OAuth dialog
          (window as any).google.accounts.id.renderButton(
            document.getElementById('google-oauth-fallback'),
            {
              theme: 'outline',
              size: 'large',
              width: '100%',
            }
          );
        }
      });
    } catch (error) {
      console.error('Error triggering Google auth:', error);
      showToast('Failed to initialize Google authentication', 'error');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Function to attempt rendering the invisible Google button
    const attemptRender = () => {
      if (googleClientId && document.getElementById(buttonContainerId)) {
        const googleReady = (window as any).google?.accounts?.id;
        
        if (!googleReady) {
          // Google not ready yet, retry after a short delay
          setTimeout(attemptRender, 500);
          return;
        }

        try {
          // Render an invisible button that we'll use for OAuth flow
          renderGoogleButton(buttonContainerId, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: mode === 'signup' ? 'signup_with' : 'signin_with',
          });
          
          // Find the actual button and hide it, then make our custom button clickable
          setTimeout(() => {
            const buttonDiv = document.getElementById(buttonContainerId);
            if (buttonDiv) {
              const googleButton = buttonDiv.querySelector('div[role="button"]');
              if (googleButton) {
                // Store reference to the real Google button
                const realButton = googleButton as HTMLElement;
                realButton.style.display = 'none';
                setIsClickable(true);
              }
            }
          }, 100);
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error rendering Google button:', error);
          setIsLoading(false);
        }
      }
    };

    // Start attempting to render
    attemptRender();

    return () => {
      // Cleanup if needed
    };
  }, [googleClientId, buttonContainerId, renderGoogleButton, mode]);

  if (!googleClientId) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Google sign-in is not configured</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden container for Google's invisible button */}
      <div
        id={buttonContainerId}
        style={{ display: 'none' }}
      />
      
      {/* Hidden fallback container */}
      <div id="google-oauth-fallback" style={{ display: 'none' }} />

      {/* Custom button that matches the design */}
      <button
        type="button"
        onClick={() => {
          // Find and click the hidden Google button
          const container = document.getElementById(buttonContainerId);
          if (container) {
            const googleButton = container.querySelector('div[role="button"]') as HTMLElement;
            if (googleButton) {
              googleButton.click();
            }
          }
        }}
        disabled={isLoading || !isClickable}
        className="w-full py-3 px-6 border-2 border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body text-base flex items-center justify-center gap-3"
      >
        <FcGoogle className="w-5 h-5" />
        <span>{getButtonText()}</span>
      </button>
    </div>
  );
}
