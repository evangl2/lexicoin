import type { CardEntity } from './CardEntity';

export type DeviceType = 'synthesis-circle' | 'grimoire-summoner';

export interface DeviceState {
    // Shared / Synthesis
    slot1_uid: string | null;
    slot2_uid: string | null;
    
    // Summoner specific
    seed_uid?: string | null;
    status?: string; // IDLE, GENERATING, READY
    
    isProcessing: boolean;
    lastResult?: CardEntity;
    errorMessage?: string;
}

export interface DeviceEntity {
    uid: string;
    type: DeviceType;
    // Base properties similar to CardEntity but simpler
    name: string; // "Synthesis Circle"
}
