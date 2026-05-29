import { useState } from 'react';
import { appAlert } from '../../lib/appAlert';
import { useAuthStore } from '../../stores/authStore';
import { navigateAfterAuth } from '../../lib/navigation';
import { usePendingRouteStore } from '../../stores/pendingRouteStore';
import { GoogleSignInButton } from './GoogleSignInButton';
import { isGoogleAuthConfigured } from '../../lib/googleAuth';

type Props = {
  title?: string;
  loading?: boolean;
  /** Optional extra profile fields when signing up from the full form */
  profile?: { firstName?: string; lastName?: string; phone?: string };
};

/** One-tap Gmail sign-up / sign-in for customers only. */
export function CustomerGoogleAuthButton({
  title = 'Continue with Google',
  loading: externalLoading,
  profile,
}: Props) {
  const customerGoogleAuth = useAuthStore((s) => s.customerGoogleAuth);
  const [busy, setBusy] = useState(false);
  const loading = externalLoading || busy;

  if (!isGoogleAuthConfigured()) {
    return null;
  }

  const handleToken = async (idToken: string) => {
    setBusy(true);
    try {
      const user = await customerGoogleAuth(idToken, profile);
      const returnTo = usePendingRouteStore.getState().consumeReturnTo();
      navigateAfterAuth(user.role, returnTo);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      appAlert('Google sign-in failed', text || 'Could not sign in with Google');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GoogleSignInButton title={title} loading={loading} onIdToken={handleToken} />
  );
}
