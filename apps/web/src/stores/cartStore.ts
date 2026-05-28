import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  restaurantId: string;
  restaurantName: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  clear: () => void;
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      clear: () => set({ items: [] }),
      add: (item, qty = 1) => {
        const items = get().items.slice();
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + qty };
        else items.push({ ...item, qty });
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, qty) =>
        set({
          items: get()
            .items.map((i) => (i.id === id ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        }),
    }),
    { name: 'saloneplate-cart-v1' },
  ),
);

