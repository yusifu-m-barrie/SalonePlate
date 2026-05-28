import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useRequireAuth } from '../../src/hooks/useRequireAuth';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Button } from '../../src/components/ui/Button';
import { StarRating } from '../../src/components/ui/StarRating';
import { colors, spacing, radius } from '../../src/constants/theme';
import { safeGoBack } from '../../src/lib/safeNavigation';
import { appAlert, appConfirm } from '../../src/lib/appAlert';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_MESSAGE,
  TRACKING_STEPS,
  orderStatusStepIndex,
  getDeliveryCoords,
} from '../../src/lib/orderStatus';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';

type OrderReview = { id: string; rating: number; comment?: string | null };

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  restaurantId: string;
  restaurant?: { id: string; name: string };
  review?: OrderReview | null;
  deliveryAddress?: { lat?: number; lng?: number };
};

export default function TrackingScreen() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const { isLoading: authLoading } = useRequireAuth();
  const queryClient = useQueryClient();
  const [mapCenter, setMapCenter] = useState({ latitude: 8.887, longitude: -12.043 });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const mapRef = useRef<MapView | null>(null);

  const region: Region = useMemo(() => {
    const lat = Number(mapCenter.latitude);
    const lng = Number(mapCenter.longitude);
    const safeLat = Number.isFinite(lat) ? lat : 8.887;
    const safeLng = Number.isFinite(lng) ? lng : -12.043;
    return {
      latitude: safeLat,
      longitude: safeLng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [mapCenter.latitude, mapCenter.longitude]);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/orders/${orderId}`);
      return data;
    },
    enabled: !!orderId && !authLoading,
    refetchInterval: 15000,
  });

  const confirmDelivery = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${orderId}/confirm-delivery`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Could not confirm', ax.response?.data?.message || 'Please try again');
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      await api.post('/reviews', {
        orderId,
        rating,
        foodRating: rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
      appAlert('Thank you!', 'Your rating helps other customers and the restaurant.');
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Could not submit rating', ax.response?.data?.message || 'Please try again');
    },
  });

  useEffect(() => {
    if (!orderId) return;
    const socket = io(`${SOCKET_URL}/realtime`);
    socket.emit('join_order', orderId);
    socket.on('order_update', () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
    });
    return () => { socket.disconnect(); };
  }, [orderId, queryClient]);

  useEffect(() => {
    const coords = order ? getDeliveryCoords(order) : null;
    if (coords) {
      setMapCenter({ latitude: coords.lat, longitude: coords.lng });
      // Smoothly move the map when we get real coords.
      mapRef.current?.animateToRegion(
        {
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        400,
      );
    }
  }, [order]);

  if (authLoading) return null;

  const status = order?.status || 'PLACED';
  const currentStep = orderStatusStepIndex(status);
  const isOnTheWay = status === 'ON_THE_WAY';
  const isDelivered = status === 'DELIVERED';
  const isCancelled = status === 'CANCELLED';
  const hasReview = !!order?.review;
  const showRatingForm = isDelivered && !hasReview;

  const handleSubmitReview = () => {
    if (rating < 1) {
      appAlert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    submitReview.mutate();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        ref={(r) => {
          mapRef.current = r;
        }}
        initialRegion={region}
      >
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Delivery address" pinColor={colors.gold} />
      </MapView>

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity onPress={() => safeGoBack('/(tabs)/orders')} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>

      <SafeAreaView style={styles.overlay} edges={['bottom']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <Text style={styles.orderNum}>{order?.orderNumber || 'Loading...'}</Text>
            {order?.restaurant?.name && (
              <Text style={styles.restaurantName}>{order.restaurant.name}</Text>
            )}
            <Text style={styles.status}>{ORDER_STATUS_LABEL[status] || status.replace(/_/g, ' ')}</Text>
            <Text style={styles.message}>
              {showRatingForm
                ? 'How was your order? Rate your experience below.'
                : ORDER_STATUS_MESSAGE[status] || 'Tracking your order…'}
            </Text>

            {!isCancelled && !showRatingForm && (
              <View style={styles.timeline}>
                {TRACKING_STEPS.map((step, i) => (
                  <View key={step.key} style={styles.step}>
                    <View style={[styles.dot, i <= currentStep && styles.dotActive]} />
                    <Text style={[styles.stepText, i <= currentStep && styles.stepActive]}>
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {isOnTheWay && (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmHint}>
                  Your order is on the way. Tap below when you have received your food.
                </Text>
                <Button
                  title="I received my order"
                  onPress={() =>
                    appConfirm(
                      'Confirm delivery?',
                      'Only confirm when you have received your order.',
                      () => confirmDelivery.mutate(),
                      { confirmText: 'Yes, received', cancelText: 'Not yet' },
                    )
                  }
                  loading={confirmDelivery.isPending}
                />
              </View>
            )}

            {showRatingForm && (
              <View style={styles.ratingBlock}>
                <Text style={styles.ratingTitle}>Rate your order</Text>
                <StarRating value={rating} onChange={setRating} />
                <Text style={styles.ratingLabel}>
                  {rating === 0 ? 'Tap a star' : rating === 5 ? 'Excellent!' : rating >= 4 ? 'Good' : rating >= 3 ? 'Okay' : 'Needs improvement'}
                </Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your experience (optional)"
                  placeholderTextColor={colors.softGray}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={500}
                />
                <Button
                  title="Submit rating"
                  onPress={handleSubmitReview}
                  loading={submitReview.isPending}
                  disabled={rating < 1}
                />
              </View>
            )}

            {isDelivered && hasReview && order?.review && (
              <View style={styles.reviewDone}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <View style={styles.reviewDoneBody}>
                  <Text style={styles.deliveredText}>Order complete — thanks for rating!</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= order.review!.rating ? 'star' : 'star-outline'}
                        size={18}
                        color={colors.gold}
                      />
                    ))}
                  </View>
                  {order.review.comment ? (
                    <Text style={styles.reviewComment}>"{order.review.comment}"</Text>
                  ) : null}
                </View>
              </View>
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  backCircle: {
    margin: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '62%' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.lg },
  card: { margin: spacing.lg },
  orderNum: { color: colors.softGray, fontSize: 13 },
  restaurantName: { color: colors.white, fontSize: 15, fontWeight: '600', marginTop: 2 },
  status: { color: colors.gold, fontSize: 20, fontWeight: '700', marginTop: 4 },
  message: { color: colors.softGray, fontSize: 14, marginTop: 8, lineHeight: 20 },
  timeline: { marginTop: 16 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginRight: 10 },
  dotActive: { backgroundColor: colors.gold },
  stepText: { color: colors.softGray, fontSize: 12 },
  stepActive: { color: colors.white },
  confirmBlock: { marginTop: spacing.md },
  confirmHint: { color: colors.softGray, fontSize: 13, marginBottom: spacing.sm, lineHeight: 18 },
  ratingBlock: { marginTop: spacing.md, gap: spacing.sm },
  ratingTitle: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  ratingLabel: { color: colors.gold, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  commentInput: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewDone: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: spacing.md },
  reviewDoneBody: { flex: 1 },
  starsRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  deliveredText: { color: colors.success, fontWeight: '600', fontSize: 16 },
});
