import { create } from 'zustand';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  variantName?: string;
  addonIds?: string[];
  specialInstructions?: string;
  restaurantId: string;
  restaurantName: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  promoCode: string | null;
  tipAmount: number;
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  setPromoCode: (code: string | null) => void;
  setTip: (amount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: null,
  promoCode: null,
  tipAmount: 0,

  addItem: (item) => {
    const state = get();
    if (state.restaurantId && state.restaurantId !== item.restaurantId) {
      set({ items: [item], restaurantId: item.restaurantId });
      return;
    }
    const existing = state.items.find((i) => i.menuItemId === item.menuItemId && i.variantId === item.variantId);
    if (existing) {
      set({
        items: state.items.map((i) =>
          i.menuItemId === item.menuItemId && i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        ),
        restaurantId: item.restaurantId,
      });
    } else {
      set({ items: [...state.items, item], restaurantId: item.restaurantId });
    }
  },

  removeItem: (menuItemId) => {
    const items = get().items.filter((i) => i.menuItemId !== menuItemId);
    set({ items, restaurantId: items.length ? get().restaurantId : null });
  },

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set({
      items: get().items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)),
    });
  },

  setPromoCode: (code) => set({ promoCode: code }),
  setTip: (amount) => set({ tipAmount: amount }),
  clearCart: () => set({ items: [], restaurantId: null, promoCode: null, tipAmount: 0 }),
  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
}));
