export type DeviceType = 'synthesis-circle';

export interface DeviceState {
    slot1_uid: string | null;
    slot2_uid: string | null;
    isProcessing: boolean;
}

export interface DeviceEntity {
    uid: string;
    type: DeviceType;
    // Base properties similar to CardEntity but simpler
    name: string; // "Synthesis Circle"
}
