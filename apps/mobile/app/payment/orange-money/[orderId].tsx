import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { formatCurrency, toNleAmount } from '@/lib/currency';
import { colors, spacing, radius } from '@/constants/theme';
import { appAlert } from '@/lib/appAlert';

const ORANGE = '#FF6600';
const ORANGE_DARK = '#E55A00';

type OrderSummary = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  restaurant?: { name: string };
};

type OrangeConfig = {
  merchantName: string;
  merchantMsisdn: string;
  ussdCode: string;
  instructions: string[];
};

function amountsMatch(typed: string, expectedNle: number): boolean {
  const parsed = parseFloat(typed.replace(/,/g, '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return false;
  return Math.abs(parsed - expectedNle) < 0.005;
}

export default function OrangeMoneyPaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [initiated, setInitiated] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [ussdCode, setUssdCode] = useState('#144#');
  const [polling, setPolling] = useState(false);
  const [simulateMode, setSimulateMode] = useState(false);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order-pay', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderSummary>(`/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId && isAuthenticated,
  });

  const { data: paymentPrefs } = useQuery({
    queryKey: ['user-payments'],
    queryFn: async () => {
      const { data } = await api.get<{ orangeMoneyPhone: string }>('/users/payments');
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: omConfig } = useQuery({
    queryKey: ['orange-money-config'],
    queryFn: async () => {
      const { data } = await api.get<OrangeConfig>('/payments/orange-money/config');
      return data;
    },
  });

  const expectedNle = order ? toNleAmount(order.totalAmount) : 0;
  const amountOk = amountsMatch(amountInput, expectedNle);
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const canPay = amountOk && phoneOk && !processing && !initiated;

  useEffect(() => {
    if (paymentPrefs?.orangeMoneyPhone) {
      setPhone(paymentPrefs.orangeMoneyPhone);
    }
  }, [paymentPrefs?.orangeMoneyPhone]);

  useEffect(() => {
    if (omConfig?.ussdCode) setUssdCode(omConfig.ussdCode);
  }, [omConfig?.ussdCode]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!order || order.paymentMethod !== 'ORANGE_MONEY') return;
    if (order.paymentStatus === 'COMPLETED') {
      router.replace(`/tracking/${order.id}`);
    }
  }, [order]);

  useEffect(() => {
    if (!initiated || !orderId) return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<{ paymentStatus: string }>(
          `/payments/orange-money/${orderId}/status`,
        );
        if (data.paymentStatus === 'COMPLETED') {
          clearInterval(interval);
          setPolling(false);
          router.replace(`/tracking/${orderId}`);
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [initiated, orderId]);

  const payNow = async () => {
    if (!orderId || !canPay) return;
    setProcessing(true);
    try {
      const parsedAmount = parseFloat(amountInput.replace(/,/g, '').trim());
      const { data } = await api.post<{
        smsMessage: string;
        ussdCode: string;
        message: string;
        simulate?: boolean;
      }>(`/payments/orange-money/${orderId}`, {
        phone: phone.trim(),
        amountNle: parsedAmount,
      });
      setSmsMessage(data.smsMessage || data.message);
      setUssdCode(data.ussdCode || ussdCode);
      setSimulateMode(!!data.simulate);
      setInitiated(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      appAlert('Payment failed', Array.isArray(msg) ? msg[0] : msg || 'Could not start Orange Money payment');
    } finally {
      setProcessing(false);
    }
  };

  const dialUssd = () => {
    const code = ussdCode.replace('#', '%23').replace('*', '*');
    Linking.openURL(`tel:${code}`).catch(() => {
      appAlert('Dial manually', `On your phone, dial ${ussdCode} to approve the payment.`);
    });
  };

  const simulateComplete = async () => {
    if (!orderId) return;
    try {
      await api.post(`/payments/orange-money/${orderId}/simulate-complete`);
      router.replace(`/tracking/${orderId}`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Simulation', ax.response?.data?.message || 'Only available in dev/simulate mode');
    }
  };

  const formattedExpected = useMemo(() => {
    if (!order) return '';
    return toNleAmount(order.totalAmount).toLocaleString('en-SL', {
      minimumFractionDigits: Number.isInteger(expectedNle) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }, [order, expectedNle]);

  if (authLoading || orderLoading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={ORANGE} size="large" />
          <Text style={styles.loadingText}>Loading payment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Orange Money" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.orangeBanner}>
          <Ionicons name="phone-portrait" size={28} color="#fff" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Pay with Orange Money</Text>
            <Text style={styles.bannerSub}>
              {omConfig?.merchantName || 'SalonePlate'} · Order {order.orderNumber}
            </Text>
          </View>
        </View>

        <View style={styles.dueBox}>
          <Text style={styles.dueLabel}>Total to pay</Text>
          <Text style={styles.dueAmount}>{formatCurrency(order.totalAmount)}</Text>
          {order.restaurant?.name && (
            <Text style={styles.dueHint}>{order.restaurant.name}</Text>
          )}
        </View>

        {omConfig?.merchantMsisdn ? (
          <View style={styles.merchantBox}>
            <Text style={styles.merchantLabel}>Send payment to</Text>
            <Text style={styles.merchantName}>{omConfig.merchantName}</Text>
            <Text style={styles.merchantNumber}>{omConfig.merchantMsisdn}</Text>
            <Text style={styles.merchantHint}>Orange Money · SalonePlate merchant account</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Your Orange Money number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+232 76 123 456"
          placeholderTextColor={colors.softGray}
          keyboardType="phone-pad"
          style={styles.input}
          editable={!initiated}
        />

        <Text style={styles.label}>Enter amount to pay (NLE)</Text>
        <Text style={styles.hint}>
          Type the exact total: <Text style={styles.hintBold}>NLE {formattedExpected}</Text>
        </Text>
        <TextInput
          value={amountInput}
          onChangeText={setAmountInput}
          placeholder={formattedExpected}
          placeholderTextColor={colors.softGray}
          keyboardType="decimal-pad"
          style={[styles.input, styles.amountInput, amountOk && amountInput.length > 0 && styles.inputOk]}
          editable={!initiated}
        />
        {amountInput.length > 0 && !amountOk && (
          <Text style={styles.errorText}>Amount must match NLE {formattedExpected} exactly</Text>
        )}

        {!initiated ? (
          <TouchableOpacity
            style={[styles.payBtn, !canPay && styles.payBtnDisabled]}
            onPress={payNow}
            disabled={!canPay}
            activeOpacity={0.85}
          >
            {processing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.payBtnText}>PROCESSING........</Text>
              </View>
            ) : (
              <Text style={styles.payBtnText}>PAY NOW</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.successBox}>
            <Ionicons name="chatbox-ellipses" size={24} color={ORANGE} />
            <Text style={styles.successTitle}>Check your phone</Text>
            <Text style={styles.smsText}>{smsMessage}</Text>
            <TouchableOpacity style={styles.ussdBtn} onPress={dialUssd}>
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.ussdBtnText}>Dial {ussdCode}</Text>
            </TouchableOpacity>
            {polling && (
              <View style={styles.waitRow}>
                <ActivityIndicator color={ORANGE} size="small" />
                <Text style={styles.waitText}>Waiting for payment confirmation…</Text>
              </View>
            )}
            {(__DEV__ || simulateMode) && (
              <TouchableOpacity style={styles.simBtn} onPress={simulateComplete}>
                <Text style={styles.simBtnText}>
                  {simulateMode ? 'Test: Confirm payment received' : 'Dev: Mark as paid'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>How to pay</Text>
          {(omConfig?.instructions || [
            'Enter your Orange Money number.',
            'Type the exact order total.',
            'Tap PAY NOW and check your phone.',
            'Dial #144# and follow instructions.',
          ]).map((step, i) => (
            <Text key={i} style={styles.step}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        <TouchableOpacity onPress={() => router.replace(`/tracking/${orderId}`)} style={styles.skipLink}>
          <Text style={styles.skipText}>View order (payment pending)</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.softGray },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  orangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: ORANGE,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  dueBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ORANGE,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dueLabel: { color: colors.softGray, fontSize: 13 },
  dueAmount: { color: ORANGE, fontSize: 32, fontWeight: '800', marginTop: 4 },
  dueHint: { color: colors.softGray, fontSize: 12, marginTop: 4 },
  merchantBox: {
    backgroundColor: 'rgba(255,102,0,0.12)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ORANGE,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  merchantLabel: { color: colors.softGray, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  merchantName: { color: colors.white, fontSize: 15, fontWeight: '600', marginTop: 4 },
  merchantNumber: { color: ORANGE, fontSize: 22, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },
  merchantHint: { color: colors.softGray, fontSize: 11, marginTop: 6, textAlign: 'center' },
  label: { color: colors.white, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  hint: { color: colors.softGray, fontSize: 13, marginBottom: 8 },
  hintBold: { color: colors.gold, fontWeight: '700' },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    color: colors.white,
    fontSize: 16,
    marginBottom: 8,
  },
  amountInput: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  inputOk: { borderColor: colors.success },
  errorText: { color: colors.error, fontSize: 12, marginBottom: 8 },
  payBtn: {
    backgroundColor: ORANGE,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: { shadowColor: ORANGE_DARK, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  payBtnDisabled: { backgroundColor: '#666', opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ORANGE,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: 10,
  },
  successTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  smsText: { color: colors.softGray, fontSize: 14, lineHeight: 22 },
  ussdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE_DARK,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: 8,
  },
  ussdBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  waitText: { color: colors.softGray, fontSize: 13 },
  simBtn: { marginTop: 8, padding: 10, alignItems: 'center' },
  simBtnText: { color: colors.gold, fontSize: 13 },
  steps: {
    backgroundColor: 'rgba(255,102,0,0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.25)',
  },
  stepsTitle: { color: ORANGE, fontWeight: '700', marginBottom: 8 },
  step: { color: colors.softGray, fontSize: 13, lineHeight: 22, marginBottom: 4 },
  skipLink: { marginTop: spacing.lg, alignItems: 'center' },
  skipText: { color: colors.gold, fontSize: 14 },
});
