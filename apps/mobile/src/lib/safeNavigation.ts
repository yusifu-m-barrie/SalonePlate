import { router, type Href } from 'expo-router';

/** Go back when possible; otherwise replace with a safe home route (avoids GO_BACK errors). */
export function safeGoBack(fallback: Href = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
