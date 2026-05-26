import { Redirect } from 'expo-router';

/** Rider delivery is disabled for now — restaurants deliver themselves. */
export default function RiderScreen() {
  return <Redirect href="/(tabs)" />;
}
