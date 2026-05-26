import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Share,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { LocationPicker } from '../address/LocationPicker';
import { useAuthStore } from '../../stores/authStore';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { api } from '../../lib/api';
import { colors, spacing, radius } from '../../constants/theme';
import { appAlert } from '../../lib/appAlert';
import { AppImage } from '../ui/AppImage';

const TITLES: Record<string, string> = {
  addresses: 'Saved Addresses',
  favorites: 'Favorites',
  payments: 'Payment Methods',
  notifications: 'Notifications',
  referral: 'Referral Code',
  loyalty: 'Loyalty Points',
  language: 'Language',
  support: 'Support Center',
};

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  isDefault?: boolean;
  lat?: number;
  lng?: number;
};

type Favorite = {
  id: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    coverImage?: string;
    logoUrl?: string;
    rating?: number;
  };
};

export type AccountScreenKey = keyof typeof TITLES;

type Props = { screenKey: AccountScreenKey };

function AccountSection({ screenKey }: Props) {
  const title = TITLES[screenKey];
  const { isLoading } = useRequireAuth();
  const { user, refreshUser } = useAuthStore();
  const queryClient = useQueryClient();

  const needsProfile = ['addresses', 'favorites', 'payments', 'notifications', 'loyalty'].includes(
    screenKey,
  );

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data as {
        addresses: Address[];
        favorites: Favorite[];
        settings?: Record<string, unknown>;
        loyaltyPoints?: number;
        referralCode?: string;
      };
    },
    enabled: !isLoading && needsProfile,
  });

  const { data: referral } = useQuery({
    queryKey: ['referral'],
    queryFn: async () => {
      const { data } = await api.get('/users/referral');
      return data as {
        referralCode: string;
        loyaltyPoints: number;
        referredCount: number;
        rewardPerReferral: number;
        message: string;
      };
    },
    enabled: !isLoading && screenKey === 'referral',
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/users/notifications');
      return data as { id: string; title: string; body: string; type: string; isRead: boolean; createdAt: string }[];
    },
    enabled: !isLoading && screenKey === 'notifications',
  });

  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ['user-payments'],
    queryFn: async () => {
      const { data } = await api.get('/users/payments');
      return data as {
        defaultPaymentMethod: string;
        orangeMoneyPhone: string;
        methods: { id: string; label: string; available: boolean; note?: string }[];
      };
    },
    enabled: !isLoading && screenKey === 'payments',
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const { data } = await api.get('/users/support');
      return data as { id: string; subject: string; message: string; status: string; createdAt: string }[];
    },
    enabled: !isLoading && screenKey === 'support',
  });

  const [label, setLabel] = useState('Home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Makeni');
  const [location, setLocation] = useState({ lat: 8.8864, lng: -12.0442 });
  const [language, setLanguage] = useState(user?.language || 'en');
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promos, setPromos] = useState(true);
  const [defaultPayment, setDefaultPayment] = useState('CASH_ON_DELIVERY');
  const [orangePhone, setOrangePhone] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  useEffect(() => {
    const s = profile?.settings as Record<string, unknown> | undefined;
    if (s?.orderUpdates !== undefined) setOrderUpdates(!!s.orderUpdates);
    if (s?.promos !== undefined) setPromos(!!s.promos);
  }, [profile?.settings]);

  useEffect(() => {
    if (payments) {
      setDefaultPayment(payments.defaultPaymentMethod);
      setOrangePhone(payments.orangeMoneyPhone || '');
    }
  }, [payments]);

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
  };

  const addAddress = useMutation({
    mutationFn: async () => {
      await api.post('/users/addresses', {
        label,
        street: street.trim(),
        city: city.trim(),
        lat: location.lat,
        lng: location.lng,
        isDefault: (profile?.addresses?.length ?? 0) === 0,
      });
    },
    onSuccess: () => {
      invalidateProfile();
      setStreet('');
      appAlert('Saved', 'Address added successfully');
    },
    onError: () => appAlert('Error', 'Could not save address'),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/users/addresses/${id}`),
    onSuccess: invalidateProfile,
  });

  const setDefaultAddress = useMutation({
    mutationFn: (id: string) => api.post(`/users/addresses/${id}/default`),
    onSuccess: () => {
      invalidateProfile();
      appAlert('Updated', 'Default address set');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: (restaurantId: string) => api.post(`/restaurants/${restaurantId}/favorite`),
    onSuccess: invalidateProfile,
  });

  const saveNotifPrefs = useMutation({
    mutationFn: async () => {
      await api.put('/users/me', { settings: { orderUpdates, promos } });
    },
    onSuccess: () => appAlert('Saved', 'Notification preferences updated'),
  });

  const savePayments = useMutation({
    mutationFn: async () => {
      await api.put('/users/payments', {
        defaultPaymentMethod: defaultPayment,
        orangeMoneyPhone: orangePhone.trim(),
      });
    },
    onSuccess: () => {
      refetchPayments();
      appAlert('Saved', 'Payment preferences saved');
    },
  });

  const submitSupport = useMutation({
    mutationFn: async () => {
      await api.post('/users/support', {
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
      });
    },
    onSuccess: () => {
      setSupportSubject('');
      setSupportMessage('');
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      appAlert('Submitted', 'Our team will respond within 24 hours.');
    },
    onError: () => appAlert('Error', 'Could not submit ticket'),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/users/notifications/read-all'),
    onSuccess: () => refetchNotifs(),
  });

  const saveLanguage = useMutation({
    mutationFn: async () => api.put('/users/me', { language }),
    onSuccess: async () => {
      await refreshUser();
      appAlert('Saved', 'Language preference updated');
    },
  });

  const copyReferral = (code: string) => {
    appAlert('Your referral code', code);
  };

  const shareReferral = async (code: string) => {
    await Share.share({
      message: `Order great food in Makeni with SalonePlate! Use my code ${code} when you sign up.`,
    });
  };

  if (isLoading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {profileLoading && needsProfile && (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />
        )}

        {screenKey === 'addresses' && (
          <>
            {(profile?.addresses || []).map((addr) => (
              <GlassCard key={addr.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {addr.label}
                      {addr.isDefault ? ' · Default' : ''}
                    </Text>
                    <Text style={styles.cardSub}>
                      {addr.street}, {addr.city}
                    </Text>
                  </View>
                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => setDefaultAddress.mutate(addr.id)}>
                      <Text style={styles.link}>Set default</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteLink}
                  onPress={() => deleteAddress.mutate(addr.id)}
                >
                  <Text style={styles.danger}>Remove</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
            <Text style={styles.section}>Add new address</Text>
            <LocationPicker
              value={location}
              onChange={setLocation}
              onAddressResolved={({ street: s, city: c }) => {
                if (s) setStreet(s);
                if (c) setCity(c);
              }}
            />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Label (Home, Work)"
              placeholderTextColor={colors.softGray}
              style={styles.input}
            />
            <TextInput
              value={street}
              onChangeText={setStreet}
              placeholder="Street"
              placeholderTextColor={colors.softGray}
              style={styles.input}
            />
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={colors.softGray}
              style={styles.input}
            />
            <Button title="Save Address" onPress={() => addAddress.mutate()} loading={addAddress.isPending} />
          </>
        )}

        {screenKey === 'favorites' && (
          <>
            {(profile?.favorites || []).length === 0 && (
              <Text style={styles.hint}>
                No favorites yet. Open a restaurant and tap the heart to save it here.
              </Text>
            )}
            {(profile?.favorites || []).map((fav) => (
              <GlassCard key={fav.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.favRow}
                  onPress={() => router.push(`/restaurant/${fav.restaurant.slug}`)}
                >
                  <AppImage
                    uri={fav.restaurant.logoUrl || fav.restaurant.coverImage}
                    style={styles.favImg}
                    containerStyle={styles.favImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{fav.restaurant.name}</Text>
                    {fav.restaurant.rating != null && (
                      <Text style={styles.cardSub}>★ {fav.restaurant.rating.toFixed(1)}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.softGray} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFavorite.mutate(fav.restaurant.id)}>
                  <Text style={styles.danger}>Remove from favorites</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </>
        )}

        {screenKey === 'payments' && payments && (
          <>
            {payments.methods.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.payOption,
                  defaultPayment === m.id && styles.payOptionActive,
                  !m.available && styles.payDisabled,
                ]}
                disabled={!m.available}
                onPress={() => setDefaultPayment(m.id)}
              >
                <Text style={styles.rowLabel}>{m.label}</Text>
                {defaultPayment === m.id && <Ionicons name="checkmark-circle" size={22} color={colors.gold} />}
                {m.note && <Text style={styles.cardSub}>{m.note}</Text>}
              </TouchableOpacity>
            ))}
            {defaultPayment === 'ORANGE_MONEY' && (
              <>
                <Text style={styles.section}>Orange Money number</Text>
                <TextInput
                  value={orangePhone}
                  onChangeText={setOrangePhone}
                  placeholder="+232..."
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.softGray}
                  style={styles.input}
                />
              </>
            )}
            <Button title="Save payment settings" onPress={() => savePayments.mutate()} loading={savePayments.isPending} />
          </>
        )}

        {screenKey === 'notifications' && (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Order updates</Text>
              <Switch value={orderUpdates} onValueChange={setOrderUpdates} trackColor={{ true: colors.gold }} />
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Promotions & offers</Text>
              <Switch value={promos} onValueChange={setPromos} trackColor={{ true: colors.gold }} />
            </View>
            <Button title="Save preferences" onPress={() => saveNotifPrefs.mutate()} loading={saveNotifPrefs.isPending} />
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Inbox</Text>
              {notifications.some((n) => !n.isRead) && (
                <TouchableOpacity onPress={() => markAllRead.mutate()}>
                  <Text style={styles.link}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 && (
              <Text style={styles.hint}>No notifications yet. Order updates will appear here.</Text>
            )}
            {notifications.map((n) => (
              <GlassCard key={n.id} style={[styles.card, !n.isRead && styles.unread]}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardSub}>{n.body}</Text>
                <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
              </GlassCard>
            ))}
          </>
        )}

        {screenKey === 'referral' && referral && (
          <GlassCard style={styles.card}>
            <Text style={styles.hint}>{referral.message}</Text>
            <Text style={styles.referralCode}>{referral.referralCode}</Text>
            <Text style={styles.cardSub}>
              {referral.referredCount} friend{referral.referredCount !== 1 ? 's' : ''} joined ·{' '}
              {referral.loyaltyPoints} loyalty points
            </Text>
            <View style={styles.btnRow}>
              <Button title="Copy code" variant="outline" onPress={() => copyReferral(referral.referralCode)} />
              <Button title="Share" onPress={() => shareReferral(referral.referralCode)} />
            </View>
          </GlassCard>
        )}

        {screenKey === 'loyalty' && (
          <GlassCard style={styles.card}>
            <Text style={styles.pointsValue}>{profile?.loyaltyPoints ?? user?.loyaltyPoints ?? 0}</Text>
            <Text style={styles.hint}>Earn points on every delivered order. Redeem for discounts — coming soon.</Text>
          </GlassCard>
        )}

        {screenKey === 'language' && (
          <>
            {(['en', 'krio'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langOption, language === lang && styles.langActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={styles.rowLabel}>{lang === 'en' ? 'English' : 'Krio'}</Text>
                {language === lang && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Button title="Save Language" onPress={() => saveLanguage.mutate()} loading={saveLanguage.isPending} />
          </>
        )}

        {screenKey === 'support' && (
          <>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Contact</Text>
              <Text style={styles.cardSub}>support@saloneplate.sl</Text>
              <Text style={[styles.cardSub, { marginTop: 8 }]}>+232 76 000 000 · Mon–Sun 8:00–22:00</Text>
            </GlassCard>
            <Text style={styles.section}>Your tickets</Text>
            {tickets.length === 0 && <Text style={styles.hint}>No tickets yet.</Text>}
            {tickets.map((t) => (
              <GlassCard key={t.id} style={styles.card}>
                <Text style={styles.cardTitle}>{t.subject}</Text>
                <Text style={styles.cardSub}>{t.message}</Text>
                <Text style={styles.time}>
                  {t.status.replace(/_/g, ' ')} · {new Date(t.createdAt).toLocaleDateString()}
                </Text>
              </GlassCard>
            ))}
            <Text style={styles.section}>New request</Text>
            <TextInput
              value={supportSubject}
              onChangeText={setSupportSubject}
              placeholder="Subject"
              placeholderTextColor={colors.softGray}
              style={styles.input}
            />
            <TextInput
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="Describe your issue"
              placeholderTextColor={colors.softGray}
              style={[styles.input, styles.textArea]}
              multiline
            />
            <Button
              title="Submit ticket"
              onPress={() => submitSupport.mutate()}
              loading={submitSupport.isPending}
              disabled={!supportSubject.trim() || !supportMessage.trim()}
            />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  content: { padding: spacing.lg, paddingBottom: 48 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { color: colors.white, fontWeight: '600', fontSize: 16 },
  cardSub: { color: colors.softGray, marginTop: 4, lineHeight: 20 },
  section: { color: colors.softGray, fontSize: 13, marginTop: 16, marginBottom: 8, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    marginBottom: 10,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  hint: { color: colors.softGray, lineHeight: 20 },
  referralCode: { color: colors.gold, fontSize: 28, fontWeight: '700', fontFamily: 'monospace', marginVertical: 12 },
  pointsValue: { color: colors.gold, fontSize: 40, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.white, fontSize: 16 },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  langActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.1)' },
  check: { color: colors.gold, fontSize: 18 },
  link: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  danger: { color: '#f87171', fontSize: 13, marginTop: 8 },
  deleteLink: { marginTop: 8 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  favImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.border },
  payOption: {
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  payOptionActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.08)' },
  payDisabled: { opacity: 0.45 },
  unread: { borderColor: colors.gold + '66' },
  time: { color: colors.softGray, fontSize: 11, marginTop: 6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});

export { AccountSection };
export default AccountSection;
