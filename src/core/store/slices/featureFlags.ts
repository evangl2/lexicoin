import { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';

export interface FeatureFlagsState {
    featureFlags: {
        useWCCards: boolean;
    };
    setFeatureFlag: <K extends keyof FeatureFlagsState['featureFlags']>(
        key: K,
        value: FeatureFlagsState['featureFlags'][K]
    ) => void;
}

export const createFeatureFlagsSlice: StateCreator<GameStore, [], [], FeatureFlagsState> = (set) => ({
    featureFlags: {
        useWCCards: false,
    },
    setFeatureFlag: (key, value) =>
        set((state) => ({
            featureFlags: { ...state.featureFlags, [key]: value },
        })),
});
