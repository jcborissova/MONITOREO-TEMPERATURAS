/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { notificationsService, type RawNotification } from "../services/notifications.service";

type Dict<T = boolean> = Record<number, T>;

/** Estado */
export interface NotificationsState {
  items: RawNotification[];
  loading: boolean;
  error: string | null;

  pendingAll: boolean;
  pendingIds: Dict;

  load: () => Promise<void>;
  markOne: (id: number) => Promise<void>;
  markAll: () => Promise<void>;

  setAll: (items: RawNotification[]) => void;
  upsert: (n: RawNotification) => void;
}

/** Tipo de middleware (no hace falta SetState/GetState) */
type MW = [["zustand/subscribeWithSelector", never]];

const creator: StateCreator<NotificationsState, MW, [], NotificationsState> = (set, get) => ({
  items: [],
  loading: false,
  error: null,

  pendingAll: false,
  pendingIds: {},

  setAll: (items) => set({ items }),

  upsert: (n) =>
    set((s) => {
      const idx = s.items.findIndex((x) => x.id === n.id);
      if (idx === -1) return { items: [n, ...s.items].slice(0, 1000) };
      const copy = s.items.slice();
      copy[idx] = n;
      return { items: copy };
    }),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await notificationsService.getAll();
      set({ items: data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error cargando";
      set({ error: msg, items: [] });
    } finally {
      set({ loading: false });
    }
  },

  markOne: async (id: number) => {
    const prev = get().items;
    set((s) => ({
      items: s.items.map((nn) => (nn.id === id ? { ...nn, is_read: true } : nn)),
      pendingIds: { ...s.pendingIds, [id]: true },
    }));
    try {
      await notificationsService.markRead(id);
    } catch {
      set({ items: prev }); // rollback
      throw new Error("No se pudo marcar la notificación");
    } finally {
      const { pendingIds } = get();
      const { [id]: _omit, ...rest } = pendingIds;
      set({ pendingIds: rest });
    }
  },

  markAll: async () => {
    const prev = get().items;
    set((s) => ({
      items: s.items.map((nn) => ({ ...nn, is_read: true })),
      pendingAll: true,
    }));
    try {
      await notificationsService.markAll();
    } catch {
      set({ items: prev });
      throw new Error("No se pudo marcar todas");
    } finally {
      set({ pendingAll: false });
    }
  },
});

export const useNotificationsStore = create<NotificationsState>()(
  subscribeWithSelector(creator)
);

/** Selectores */
export const selectors = {
  all: (s: NotificationsState) => s.items,
  unreadCount: (s: NotificationsState) => s.items.filter((n) => !n.is_read).length,
  loading: (s: NotificationsState) => s.loading,
  pendingAll: (s: NotificationsState) => s.pendingAll,
  pendingIds: (s: NotificationsState) => s.pendingIds,
};
