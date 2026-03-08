import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    primaryColor: string;
    ambientOpacity: number;
    setPrimaryColor: (color: string) => void;
    setAmbientOpacity: (opacity: number) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            primaryColor: '#10b981', // Default Emerald
            ambientOpacity: 0.05,
            setPrimaryColor: (color) => set({ primaryColor: color }),
            setAmbientOpacity: (opacity) => set({ ambientOpacity: opacity }),
        }),
        {
            name: 'orbit-theme-storage',
        }
    )
);
