import { create } from 'zustand';

interface AppState {
    sceneMode: 'interactive' | 'background' | 'hidden';
    activePanel: 'welcome' | 'goals' | 'journey' | 'summary' | null;
    setScene: (mode: AppState['sceneMode']) => void;
    showPanel: (panel: AppState['activePanel']) => void;
    hidePanels: () => void;
}

export const useAppStateStore = create<AppState>((set) => ({
    sceneMode: 'interactive',
    activePanel: null,
    setScene: (mode) => set({ sceneMode: mode }),
    showPanel: (panel) => set({ activePanel: panel }),
    hidePanels: () => set({ activePanel: null }),
})); 