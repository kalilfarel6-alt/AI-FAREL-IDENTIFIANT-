import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ScanResult, PipingComponent } from '../types';

interface ScanState {
  currentScan: ScanResult | null;
  history: ScanResult[];
  startScan: (imageUrl: string) => void;
  setScanSuccess: (data: PipingComponent) => void;
  setScanError: (error: string) => void;
  addToHistory: (scan: ScanResult) => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      currentScan: null,
      history: [],
      
      startScan: (imageUrl: string) => set({
        currentScan: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl,
          data: null,
          loading: true,
          error: null
        }
      }),

      setScanSuccess: (data: PipingComponent) => {
        const current = get().currentScan;
        if (current) {
          const completedScan = { ...current, loading: false, data };
          set({ 
            currentScan: completedScan,
          });
          get().addToHistory(completedScan);
        }
      },

      setScanError: (error: string) => {
        const current = get().currentScan;
        if (current) {
          set({ 
            currentScan: { ...current, loading: false, error }
          });
        }
      },

      addToHistory: (scan: ScanResult) => set((state) => {
        // Keep only last 10 items to prevent storage quota issues
        const newHistory = [scan, ...state.history].slice(0, 10);
        return { history: newHistory };
      }),
    }),
    {
      name: 'pipeid-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        setItem: (name, value) => {
            try {
                localStorage.setItem(name, value);
            } catch (e) {
                console.warn('LocalStorage Quota Exceeded. Scan history might not be saved.', e);
                // In a real app, we might clear old history here or use IndexedDB
            }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
      partialize: (state) => ({
        history: state.history,
        currentScan: state.currentScan
      }),
    }
  )
);