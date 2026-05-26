import { create } from 'zustand';

interface PendingRouteState {
  returnTo: string | null;
  setReturnTo: (path: string | null) => void;
  consumeReturnTo: () => string | null;
}

export const usePendingRouteStore = create<PendingRouteState>((set, get) => ({
  returnTo: null,
  setReturnTo: (returnTo) => set({ returnTo }),
  consumeReturnTo: () => {
    const returnTo = get().returnTo;
    set({ returnTo: null });
    return returnTo;
  },
}));
