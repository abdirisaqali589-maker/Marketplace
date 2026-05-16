import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface PreferenceState {
  theme: Theme;
  accessibility: boolean;
  highContrast: boolean;
  toggleTheme: () => void;
  toggleAccessibility: () => void;
  toggleHighContrast: () => void;
}

function applyPreferences(theme: Theme, accessibility: boolean, highContrast: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('accessibility-on', accessibility);
  root.classList.toggle('high-contrast', highContrast);
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      accessibility: false,
      highContrast: false,
      toggleTheme: () => {
        const theme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme });
        applyPreferences(theme, get().accessibility, get().highContrast);
      },
      toggleAccessibility: () => {
        const accessibility = !get().accessibility;
        set({ accessibility });
        applyPreferences(get().theme, accessibility, get().highContrast);
      },
      toggleHighContrast: () => {
        const highContrast = !get().highContrast;
        set({ highContrast });
        applyPreferences(get().theme, get().accessibility, highContrast);
      },
    }),
    {
      name: 'marketplace-preferences',
      onRehydrateStorage: () => (state) => {
        if (state) applyPreferences(state.theme, state.accessibility, state.highContrast);
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const state = usePreferenceStore.getState();
  applyPreferences(state.theme, state.accessibility, state.highContrast);
}