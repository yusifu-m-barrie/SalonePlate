import { useModalStore, type ModalButton } from '@/stores/modalStore';

export function appAlert(title: string, message?: string, buttons?: ModalButton[]) {
  useModalStore.getState().show({ title, message, buttons });
}

export function appConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: { confirmText?: string; cancelText?: string; destructive?: boolean },
) {
  useModalStore.getState().show({
    title,
    message,
    buttons: [
      { text: options?.cancelText || 'Cancel', style: 'cancel' },
      {
        text: options?.confirmText || 'OK',
        style: options?.destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ],
  });
}
