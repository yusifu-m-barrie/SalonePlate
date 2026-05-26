import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useModalStore } from '../../stores/modalStore';
import { colors, spacing, radius } from '../../constants/theme';

export function AppModal() {
  const { visible, title, message, buttons, hide } = useModalStore();

  const onPress = (btn: (typeof buttons)[0]) => {
    hide();
    setTimeout(() => btn.onPress?.(), 0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hide}>
      <Pressable style={styles.overlay} onPress={hide}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={`${btn.text}-${i}`}
                style={[
                  styles.btn,
                  btn.style === 'cancel' && styles.btnCancel,
                  btn.style === 'destructive' && styles.btnDestructive,
                  buttons.length === 1 && styles.btnFull,
                ]}
                onPress={() => onPress(btn)}
              >
                <Text
                  style={[
                    styles.btnText,
                    btn.style === 'cancel' && styles.btnTextCancel,
                    btn.style === 'destructive' && styles.btnTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { color: colors.softGray, fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    minWidth: 88,
    alignItems: 'center',
  },
  btnFull: { flex: 1 },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnDestructive: { backgroundColor: 'rgba(220,38,38,0.2)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.5)' },
  btnText: { color: colors.darkBlue, fontWeight: '700', fontSize: 15 },
  btnTextCancel: { color: colors.white },
  btnTextDestructive: { color: '#fca5a5' },
});
