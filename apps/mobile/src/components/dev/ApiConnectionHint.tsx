import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { API_URL } from '../../lib/api';
import { colors, spacing, radius } from '../../constants/theme';

const HEALTH_URL = `${API_URL.replace(/\/$/, '')}/health`;

export function ApiConnectionHint() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(HEALTH_URL, { method: 'GET' });
        if (!res.ok) throw new Error('not ok');
        if (!cancelled) setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!__DEV__ || !failed) return null;

  const host = API_URL.replace(/\/api\/v1\/?$/, '');

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
      <Text style={styles.title}>Cannot reach API server</Text>
      <Text style={styles.body}>
        Phone must load:{'\n'}
        {HEALTH_URL}
      </Text>
      <Text style={styles.steps}>
        1. PC and phone on the same Wi‑Fi{'\n'}
        2. API running: npm run dev:api{'\n'}
        3. Run: npm run sync:ip then expo start -c{'\n'}
        4. Allow Windows Firewall (Admin): npm run firewall:api
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(HEALTH_URL)}>
        <Text style={styles.btnText}>Open health check in browser</Text>
      </TouchableOpacity>
      <Text style={styles.meta}>Configured: {host}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
  },
  banner: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  title: { color: '#fca5a5', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  body: { color: colors.white, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  steps: { color: colors.softGray, fontSize: 12, lineHeight: 20, marginBottom: 12 },
  btn: {
    backgroundColor: colors.gold,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { color: colors.darkBlue, fontWeight: '700', fontSize: 13 },
  meta: { color: colors.softGray, fontSize: 11, marginTop: 10 },
});
