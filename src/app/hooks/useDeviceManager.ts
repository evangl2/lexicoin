import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motionValue, MotionValue } from "motion/react";
import { db, DeviceRecord, CardLocation } from "@core/storage/db"; // Added CardLocation import
import { logger } from "@utils/logger";
import { nanoid } from "nanoid";
import { DeviceType, DeviceState } from "@/types/DeviceEntity";

// Runtime Device Item
export interface DeviceItem {
    uid: string;
    type: DeviceType;
    name: string;
    mx: MotionValue<number>;
    my: MotionValue<number>;
    location: CardLocation; // Updated from 'canvas' | 'repository'
    state: DeviceState;
}

const INITIAL_DEVICE_UID = 'device-synthesis-circle-01';

export const useDeviceManager = () => {
    const [devices, setDevices] = useState<DeviceItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Derived Lists
    const canvasDevices = useMemo(() => devices.filter(d => d.location === 'canvas'), [devices]);
    const repositoryDevices = useMemo(() => devices.filter(d => d.location === 'repository'), [devices]);

    // ==== Load Devices ====
    useEffect(() => {
        let cancelled = false;

        const loadDevices = async () => {
            try {
                const records = await db.devices.toArray();

                // Seed initial device if DB is empty
                if (records.length === 0) {
                    const initialDevice: DeviceRecord = {
                        uid: INITIAL_DEVICE_UID,
                        type: 'synthesis-circle',
                        x: 0,
                        y: 0,
                        location: 'repository',
                        state: { slot1_uid: null, slot2_uid: null, isProcessing: false }
                    };
                    await db.devices.add(initialDevice);
                    records.push(initialDevice);
                }

                if (cancelled) return;

                const loadedDevices = records.map(rec => ({
                    uid: rec.uid,
                    type: rec.type,
                    name: 'Synthesis Circle', // Hardcoded for now, could be dynamic
                    mx: motionValue(Number.isFinite(rec.x) ? rec.x : 0),
                    my: motionValue(Number.isFinite(rec.y) ? rec.y : 0),
                    location: rec.location,
                    state: rec.state,
                }));

                setDevices(loadedDevices);
                setIsLoaded(true);

            } catch (err) {
                logger.error('Failed to load devices', err, 'useDeviceManager');
            }
        };

        loadDevices();

        return () => { cancelled = true; };
    }, []);

    // ==== Persistence ====
    const saveDevices = useCallback(() => {
        if (!isLoaded) return;

        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const records: DeviceRecord[] = devices.map(d => ({
                uid: d.uid,
                type: d.type,
                x: d.mx.get(),
                y: d.my.get(),
                location: d.location,
                state: d.state
            }));

            db.transaction('rw', db.devices, async () => {
                await db.devices.bulkPut(records);
            }).catch(err => {
                logger.error('Failed to save devices', err, 'useDeviceManager');
            });
        }, 300);
    }, [devices, isLoaded]);

    useEffect(() => {
        if (isLoaded) saveDevices();
    }, [devices, isLoaded, saveDevices]); // Deep dependency on devices to trigger save on state change? 
    // Optimization: 'devices' changes on every state update, so this works.

    // ==== Actions ====

    const storeDevice = useCallback((uid: string, onEject?: (slotUid: string, x: number, y: number) => void) => {
        setDevices(prev => {
            // ⚡ Bolt Performance Optimization:
            // Replaced .map() with .findIndex() to avoid O(N) full array iteration
            // and prevent unnecessary React re-renders when the target item is missing.
            const index = prev.findIndex(d => d.uid === uid);
            if (index === -1) return prev;

            const newDevices = [...prev];
            const d = newDevices[index] as DeviceItem;

            // Ejection Logic
            if (onEject) {
                const currentX = d.mx.get();
                const currentY = d.my.get();

                // Eject Slot 1
                if (d.state.slot1_uid) {
                    // Offset slightly for visibility
                    onEject(d.state.slot1_uid, currentX - 60, currentY);
                }
                // Eject Slot 2
                if (d.state.slot2_uid) {
                    onEject(d.state.slot2_uid, currentX + 60, currentY);
                }
            }

            newDevices[index] = {
                ...d,
                location: 'repository',
                // Clear slots on store - MUTUALLY EXCLUSIVE
                state: { ...d.state, slot1_uid: null, slot2_uid: null }
            };

            return newDevices;
        });
    }, []);

    const retrieveDevice = useCallback((uid: string, x: number, y: number) => {
        setDevices(prev => {
            // ⚡ Bolt Performance Optimization:
            // Short-circuiting single element updates prevents redundant re-renders.
            const index = prev.findIndex(d => d.uid === uid);
            if (index === -1) return prev;

            const newDevices = [...prev];
            const d = newDevices[index] as DeviceItem;

            // Return new object with new MotionValues to reset velocity (same as cards)
            newDevices[index] = {
                ...d,
                location: 'canvas',
                mx: motionValue(x),
                my: motionValue(y)
            };

            return newDevices;
        });
    }, []);

    const updateDeviceState = useCallback((uid: string, newState: Partial<DeviceState>) => {
        setDevices(prev => {
            // ⚡ Bolt Performance Optimization
            const index = prev.findIndex(d => d.uid === uid);
            if (index === -1) return prev;

            const newDevices = [...prev];
            const d = newDevices[index] as DeviceItem;
            newDevices[index] = { ...d, state: { ...d.state, ...newState } };
            return newDevices;
        });
    }, []);

    const updateDevicePosition = useCallback((uid: string, x: number, y: number) => {
        // Handled by MotionValues naturally, but we might want to sync if needed.
        // For now, saveDevices handles the atomic snapshot.
    }, []);

    return {
        devices,
        canvasDevices,
        repositoryDevices,
        storeDevice,
        retrieveDevice,
        updateDeviceState,
        isLoaded
    };
};
