import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { appAlert } from '../../lib/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { isGoogleAuthConfigured, useGoogleIdToken } from '../../lib/googleAuth';
import { colors, radius, spacing } from '../../constants/theme';

interface GoogleSignInButtonProps {
  title?: string;
  loading?: boolean;
  onIdToken: (idToken: string) => Promise<void>;
}

/** Renders nothing if Google client IDs are not configured. */
export function GoogleSignInButton({
  title = 'Continue with Google',
  loading: externalLoading,
  onIdToken,
}: GoogleSignInButtonProps) {
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  return (
    <GoogleSignInButtonInner
      title={title}
      loading={externalLoading}
      onIdToken={onIdToken}
    />
  );
}

function GoogleSignInButtonInner({ title, loading: externalLoading, onIdToken }: GoogleSignInButtonProps) {
  const { getIdToken, ready } = useGoogleIdToken();
  const [busy, setBusy] = useState(false);
  const loading = externalLoading || busy;

  const handlePress = async () => {
    if (!ready) {
      appAlert('Please wait', 'Google sign-in is still loading');
      return;
    }
    setBusy(true);
    try {
      const idToken = await getIdToken();
      if (idToken) await onIdToken(idToken);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, loading && styles.btnDisabled]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.85}
    >
      <Ionicons name="logo-google" size={20} color={colors.white} />
      <Text style={styles.text}>{loading ? 'Please wait...' : title}</Text>
    </TouchableOpacity>
  );
}

/** Hint when Google tab is shown but env vars are missing. */
export function GoogleNotConfiguredHint() {
  if (isGoogleAuthConfigured()) return null;
  return (
    <View style={styles.hintBox}>
      <Text style={styles.hint}>
        Google sign-in is optional. Use the Email tab to create your account, or add
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iPhone) to
        apps/mobile/.env
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  btnDisabled: { opacity: 0.6 },
  text: { color: colors.white, fontWeight: '600', fontSize: 16 },
  hintBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.softGray, fontSize: 13, lineHeight: 20 },
});
