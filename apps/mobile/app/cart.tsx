import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../src/stores/cartStore';
import { useAuthStore } from '../src/stores/authStore';
import { requireAuthForRoute } from '../src/lib/navigation';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { Button } from '../src/components/ui/Button';
import { colors, spacing } from '../src/constants/theme';
import { formatCurrency } from '../src/lib/currency';

const TAX_RATE = 0.05;

export default function CartScreen() {
  const { items, updateQuantity, subtotal } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const itemSubtotal = subtotal();
  const tax = itemSubtotal * TAX_RATE;
  const total = itemSubtotal + tax;

  const goCheckout = () => {
    if (!isAuthenticated) {
      requireAuthForRoute('/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (!items.length) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Your Cart" />
        <Text style={styles.empty}>Your cart is empty</Text>
        <Button title="Browse Restaurants" onPress={() => router.replace('/(tabs)')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your Cart" />

      <ScrollView style={styles.list}>
        {items.map((item) => (
          <View key={`${item.menuItemId}-${item.variantId}`} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)}>
                <Ionicons name="remove-circle" size={28} color={colors.softGray} />
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)}>
                <Ionicons name="add-circle" size={28} color={colors.gold} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.row}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>{formatCurrency(itemSubtotal)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Delivery</Text><Text style={styles.value}>At checkout</Text></View>
        <View style={styles.row}><Text style={styles.label}>Tax (5%)</Text><Text style={styles.value}>{formatCurrency(tax)}</Text></View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Est. total (excl. delivery)</Text>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
        </View>
        <Text style={styles.deliveryNote}>Delivery fee is calculated at checkout from your location on the map.</Text>
        <Button title={isAuthenticated ? 'Checkout' : 'Sign in to checkout'} onPress={goCheckout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { color: colors.white, fontWeight: '600' },
  itemPrice: { color: colors.gold, marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qty: { color: colors.white, fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  summary: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: colors.softGray },
  value: { color: colors.white },
  totalRow: { marginTop: 8, marginBottom: 16 },
  totalLabel: { fontWeight: '700', color: colors.white, fontSize: 16 },
  total: { fontWeight: '700', color: colors.gold, fontSize: 18 },
  deliveryNote: { color: colors.softGray, fontSize: 12, marginBottom: 16, lineHeight: 18 },
  empty: { color: colors.softGray, textAlign: 'center', marginBottom: 20, paddingHorizontal: spacing.lg },
});
