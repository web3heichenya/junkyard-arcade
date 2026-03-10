import { create } from 'zustand';

type UiState = {
  advanced: boolean;
  toggleAdvanced: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  advanced: false,
  toggleAdvanced: () => set((s) => ({ advanced: !s.advanced })),
}));
