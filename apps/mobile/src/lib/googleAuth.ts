import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

function getGoogleClientIds() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || webClientId) ?? undefined;
  const androidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || webClientId) ?? undefined;
  return { webClientId, iosClientId, androidClientId };
}

/** True only when platform-required client IDs are present (avoids iOS crash). */
export function isGoogleAuthConfigured(): boolean {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  if (!webClientId) return false;
  if (Platform.OS === 'ios') return Boolean(iosClientId);
  if (Platform.OS === 'android') return Boolean(androidClientId);
  return true;
}

/**
 * Google auth hook — only use inside a component rendered when `isGoogleAuthConfigured()` is true.
 */
export function useGoogleIdToken() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: webClientId!,
    iosClientId: iosClientId!,
    androidClientId: androidClientId!,
  });

  const getIdToken = async (): Promise<string | null> => {
    const result = await promptAsync();
    if (result?.type === 'success' && result.params.id_token) {
      return result.params.id_token;
    }
    return null;
  };

  return { getIdToken, ready: !!request };
}
