import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';

export const OWNER_FULFILLMENT_STEPS = [
  {
    status: 'PREPARING',
    label: 'Start preparing',
    note: 'Preparation started',
    icon: 'flame-outline' as const,
  },
  {
    status: 'RIDER_ASSIGNED',
    label: 'Make food ready',
    note: 'Order ready — customer notified',
    icon: 'checkmark-done-outline' as const,
  },
  {
    status: 'ON_THE_WAY',
    label: 'Out for delivery',
    note: 'Left restaurant — on the way to customer',
    icon: 'bicycle-outline' as const,
  },
] as const;

/** -1 = accepted, 0 = preparing, 1 = ready, 2+ = on the way / delivered */
export function fulfillmentProgress(orderStatus: string): number {
  if (orderStatus === 'RESTAURANT_ACCEPTED') return -1;
  if (orderStatus === 'PREPARING') return 0;
  if (orderStatus === 'RIDER_ASSIGNED') return 1;
  if (orderStatus === 'ON_THE_WAY' || orderStatus === 'DELIVERED') return 2;
  return -2;
}

type StepUiState = 'completed' | 'active' | 'locked';

function stepState(progress: number, stepIndex: number): StepUiState {
  if (progress >= 2) return 'completed';
  if (progress >= stepIndex) return 'completed';
  if (progress + 1 === stepIndex) return 'active';
  return 'locked';
}

type Props = {
  orderStatus: string;
  onAdvance: (status: string, note: string) => void;
  loading?: boolean;
};

export function OwnerOrderSteps({ orderStatus, onAdvance, loading }: Props) {
  const progress = fulfillmentProgress(orderStatus);
  if (progress < -1) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Order progress</Text>
      {OWNER_FULFILLMENT_STEPS.map((step, index) => {
        const state = stepState(progress, index);
        const isActive = state === 'active';
        const isCompleted = state === 'completed';

        return (
          <TouchableOpacity
            key={step.status}
            disabled={state !== 'active' || loading}
            onPress={() => onAdvance(step.status, step.note)}
            style={[
              styles.step,
              isActive && styles.stepActive,
              isCompleted && styles.stepCompleted,
              state === 'locked' && styles.stepLocked,
            ]}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.iconCircle,
                isActive && styles.iconCircleActive,
                isCompleted && styles.iconCircleDone,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={20} color={colors.darkBlue} />
              ) : (
                <Ionicons name={step.icon} size={20} color={isActive ? colors.darkBlue : colors.softGray} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
              {isCompleted && <Text style={styles.stepDone}>Completed</Text>}
              {state === 'locked' && <Text style={styles.stepLockedText}>Complete previous step first</Text>}
            </View>
            {isActive && loading ? (
              <ActivityIndicator color={colors.gold} />
            ) : isActive ? (
              <Ionicons name="chevron-forward" size={22} color={colors.gold} />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, gap: 8 },
  heading: { color: colors.softGray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  stepActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  stepCompleted: { opacity: 0.55 },
  stepLocked: { opacity: 0.4 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: { backgroundColor: colors.gold },
  iconCircleDone: { backgroundColor: colors.success },
  stepLabel: { color: colors.softGray, fontSize: 15, fontWeight: '600' },
  stepLabelActive: { color: colors.white },
  stepDone: { color: colors.success, fontSize: 12, marginTop: 2 },
  stepLockedText: { color: colors.softGray, fontSize: 11, marginTop: 2 },
});
