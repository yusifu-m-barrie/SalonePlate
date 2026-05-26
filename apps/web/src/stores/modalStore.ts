import { create } from 'zustand';

export type ModalButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type ModalState = {
  visible: boolean;
  title: string;
  message: string;
  buttons: ModalButton[];
  show: (opts: { title: string; message?: string; buttons?: ModalButton[] }) => void;
  hide: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],
  show: ({ title, message = '', buttons }) =>
    set({
      visible: true,
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    }),
  hide: () => set({ visible: false }),
}));
