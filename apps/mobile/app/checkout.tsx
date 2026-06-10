import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../src/lib/api';
import { useCartStore } from '../src/stores/cartStore';
import { useAuthStore } from '../src/stores/authStore';
import { requireAuthForRoute } from '../src/lib/navigation';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { Button } from '../src/components/ui/Button';
import { LocationPicker } from '../src/components/address/LocationPicker';
import { colors, spacing, radius } from '../src/constants/theme';
import { formatCurrency } from '../src/lib/currency';
import { appAlert } from '../src/lib/appAlert';

const PAYMENT_METHODS = [
  { id: 'ORANGE_MONEY', label: 'Orange Money', icon: 'phone-portrait' },
  { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', icon: 'cash' },
  { id: 'CARD', label: 'Card (Coming Soon)', icon: 'card', disabled: true },
];

const TAX_RATE = 0.05;
const DEFAULT_LOCATION = { lat: 8.8864, lng: -12.0442 };

type DeliveryQuote = {
  deliveryFee: number;
  distanceKm: number;
  includedKm: number;
  feePerKm: number;
};

export default function CheckoutScreen() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { items, restaurantId, subtotal, clearCart, promoCode, setPromoCode } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [loading, setLoading] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Makeni');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [promoInput, setPromoInput] = useState(promoCode || '');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);

  const { data: paymentPrefs } = useQuery({
    queryKey: ['user-payments'],
    queryFn: async () => {
      const { data } = await api.get<{ defaultPaymentMethod: string }>('/users/payments');
      return data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (paymentPrefs?.defaultPaymentMethod) {
      setPaymentMethod(paymentPrefs.defaultPaymentMethod);
    }
  }, [paymentPrefs?.defaultPaymentMethod]);

  const itemSubtotal = subtotal();

  const {
    data: quote,
    isFetching: quoteLoading,
    error: quoteError,
  } = useQuery({
    queryKey: ['delivery-quote', restaurantId, location.lat, location.lng],
    queryFn: async () => {
      const { data } = await api.get<DeliveryQuote>('/orders/quote/delivery', {
        params: { restaurantId, lat: location.lat, lng: location.lng },
      });
      return data;
    },
    enabled: !!restaurantId && !!isAuthenticated,
    retry: false,
  });

  const deliveryFee = freeDelivery ? 0 : (quote?.deliveryFee ?? 0);
  const tax = itemSubtotal * TAX_RATE;
  const total = Math.max(0, itemSubtotal + deliveryFee + tax - promoDiscount);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requireAuthForRoute('/checkout');
    }
  }, [isAuthenticated, isLoading]);

  const quoteErrorMessage = quoteError
    ? ((quoteError as { response?: { data?: { message?: string } } }).response?.data?.message ||
      'Could not calculate delivery fee for this location')
    : null;

  const applyPromo = async () => {
    if (!promoInput.trim() || !restaurantId) return;
    setPromoApplying(true);
    try {
      const { data } = await api.get(`/promotions/validate/${encodeURIComponent(promoInput.trim())}`, {
        params: { subtotal: itemSubtotal, restaurantId },
      });
      const code = promoInput.trim().toUpperCase();
      setPromoCode(code);
      if (data.promo?.type === 'FREE_DELIVERY') {
        setFreeDelivery(true);
        setPromoDiscount(0);
        appAlert('Promo applied', `Code "${code}" — free delivery on this order!`);
      } else {
        setFreeDelivery(false);
        setPromoDiscount(data.discount || 0);
        appAlert('Promo applied', `Code "${code}" — you save ${formatCurrency(data.discount || 0)}`);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Invalid promo', ax.response?.data?.message || 'Promo code could not be applied');
      setPromoCode(null);
      setPromoDiscount(0);
      setFreeDelivery(false);
    } finally {
      setPromoApplying(false);
    }
  };

  const placeOrder = async () => {
    if (!restaurantId) {
      appAlert('Empty cart', 'Add items before checkout');
      return;
    }
    if (!street.trim() || !city.trim()) {
      appAlert('Address required', 'Enter your delivery street and city');
      return;
    }
    if (!quote && !freeDelivery) {
      appAlert('Delivery location', quoteErrorMessage || 'Set your delivery location on the map first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        restaurantId,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          variantId: i.variantId,
          addonIds: i.addonIds,
          specialInstructions: i.specialInstructions,
        })),
        deliveryAddress: {
          label: addressLabel,
          street: street.trim(),
          city: city.trim(),
          lat: location.lat,
          lng: location.lng,
        },
        paymentMethod,
        promoCode: promoCode || undefined,
        tipAmount: 0,
      });
      clearCart();
      if (paymentMethod === 'ORANGE_MONEY') {
        router.replace(`/payment/orange-money/${data.id}`);
      } else {
        router.replace(`/tracking/${data.id}`);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      appAlert('Error', Array.isArray(msg) ? msg[0] : msg || 'Could not place order');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Checkout" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}>
        <Text style={styles.section}>Delivery location</Text>
        <LocationPicker
          value={location}
          onChange={setLocation}
          onAddressResolved={({ street: resolvedStreet, city: resolvedCity }) => {
            if (resolvedStreet) setStreet(resolvedStreet);
            if (resolvedCity) setCity(resolvedCity);
          }}
        />

        <Text style={styles.section}>Address details</Text>
        <TextInput value={addressLabel} onChangeText={setAddressLabel} placeholder="Label (Home, Work…)" placeholderTextColor={colors.softGray} style={styles.input} />
        <TextInput value={street} onChangeText={setStreet} placeholder="Street / landmark" placeholderTextColor={colors.softGray} style={styles.input} />
        <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.softGray} style={styles.input} />

        {quoteLoading && (
          <View style={styles.quoteRow}>
            <ActivityIndicator color={colors.gold} size="small" />
            <Text style={styles.quoteHint}>Calculating delivery fee…</Text>
          </View>
        )}
        {quote && !quoteLoading && (
          <Text style={styles.quoteHint}>
            {quote.distanceKm} km from restaurant · {formatCurrency(quote.feePerKm)}/km after first {quote.includedKm} km
          </Text>
        )}
        {quoteErrorMessage && !quoteLoading && (
          <Text style={styles.quoteError}>{quoteErrorMessage}</Text>
        )}

        <Text style={styles.section}>Promo code</Text>
        <View style={styles.promoRow}>
          <TextInput
            value={promoInput}
            onChangeText={setPromoInput}
            placeholder="Enter code"
            placeholderTextColor={colors.softGray}
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.promoBtn, promoApplying && styles.promoBtnDisabled]}
            onPress={applyPromo}
            disabled={promoApplying}
          >
            {promoApplying ? (
              <ActivityIndicator color={colors.darkBlue} size="small" />
            ) : (
              <Text style={styles.promoBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
        {promoDiscount > 0 && (
          <Text style={styles.promoSaved}>Discount: {formatCurrency(promoDiscount)}</Text>
        )}
        {freeDelivery && <Text style={styles.promoSaved}>Free delivery applied</Text>}

        <Text style={styles.section}>Payment Method</Text>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.paymentOption, paymentMethod === m.id && styles.paymentActive, m.disabled && styles.disabled]}
            onPress={() => !m.disabled && setPaymentMethod(m.id)}
            disabled={m.disabled}
          >
            <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={22} color={paymentMethod === m.id ? colors.gold : colors.softGray} />
            <Text style={styles.paymentLabel}>{m.label}</Text>
            {paymentMethod === m.id && <Ionicons name="checkmark-circle" size={22} color={colors.gold} />}
          </TouchableOpacity>
        ))}

        <View style={styles.summary}>
          <View style={styles.row}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>{formatCurrency(itemSubtotal)}</Text></View>
          <View style={styles.row}>
            <Text style={styles.label}>Delivery{quote ? ` (${quote.distanceKm} km)` : ''}</Text>
            <Text style={styles.value}>
              {quoteLoading ? '…' : freeDelivery ? 'Free' : quote ? formatCurrency(deliveryFee) : '—'}
            </Text>
          </View>
          <View style={styles.row}><Text style={styles.label}>Tax (5%)</Text><Text style={styles.value}>{formatCurrency(tax)}</Text></View>
          {promoDiscount > 0 && (
            <View style={styles.row}><Text style={styles.label}>Promo discount</Text><Text style={styles.value}>- {formatCurrency(promoDiscount)}</Text></View>
          )}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={`Place Order · ${formatCurrency(total)}`}
          onPress={placeOrder}
          loading={loading}
          disabled={!quote && !freeDelivery && !!quoteError}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  section: { color: colors.softGray, fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    marginBottom: 8,
  },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  quoteHint: { color: colors.softGray, fontSize: 12, marginTop: 4 },
  quoteError: { color: '#f87171', fontSize: 13, marginTop: 4 },
  promoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  promoBtn: { backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.md, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  promoBtnDisabled: { opacity: 0.7 },
  promoBtnText: { color: colors.darkBlue, fontWeight: '700' },
  promoSaved: { color: colors.success, fontSize: 13 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.cardBg, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  paymentActive: { borderColor: colors.gold },
  disabled: { opacity: 0.4 },
  paymentLabel: { flex: 1, color: colors.white },
  summary: { marginTop: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: colors.softGray },
  value: { color: colors.white },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontWeight: '700', color: colors.white, fontSize: 16 },
  total: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
