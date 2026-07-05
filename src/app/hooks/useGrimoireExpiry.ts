/**
 * useGrimoireExpiry.ts
 *
 * 职责：实时监控 activeGrimoires 的过期状态。
 * - 每 30 秒轮询一次
 * - 到期处理：清空槽位 senseId → MessageBus SENSE_RETURNED → 标记 EXPIRED → 延迟后移除
 * - 在顶层组件挂载（App.tsx）
 */

import { useEffect } from 'react';
import { useGameStore } from '@/core/store';
import { messageBus } from '@/core/protocol/MessageBus';
import { GRIMOIRE_EXPIRY_POLL_INTERVAL_MS, GRIMOIRE_EXPIRE_ANIMATION_DELAY_MS } from '@/config/grimoireConfig';

export function useGrimoireExpiry() {
    const activeGrimoires   = useGameStore(s => s.activeGrimoires);
    const updateGrimoire    = useGameStore(s => s.updateGrimoire);
    const updateGrimoireStatus = useGameStore(s => s.updateGrimoireStatus);
    const expireGrimoire    = useGameStore(s => s.expireGrimoire);

    useEffect(() => {
        const check = () => {
            const now = Date.now();
            const store = useGameStore.getState();

            store.activeGrimoires.forEach(g => {
                if (g.expiresAt < now && g.status !== 'EXPIRED' && g.status !== 'RESOLVED' && g.status !== 'ARCHIVED') {
                    // 1. Collect filled senseIds before clearing
                    const filledSenseIds = g.slots
                        .filter(s => s.senseId !== null)
                        .map(s => s.senseId!);

                    // 2. Clear all slot senseIds
                    const clearedSlots = g.slots.map(s => ({ ...s, senseId: null }));
                    updateGrimoire(g.id, { slots: clearedSlots });

                    // 3. Notify that senses have been returned to hand
                    if (filledSenseIds.length > 0) {
                        messageBus.send('SENSE_RETURNED', { senseIds: filledSenseIds }, 'useGrimoireExpiry');
                    }

                    // 4. Mark as EXPIRED (triggers any listening animations)
                    updateGrimoireStatus(g.id, 'EXPIRED');

                    // 5. Remove after animation window
                    setTimeout(() => {
                        expireGrimoire(g.id);
                    }, GRIMOIRE_EXPIRE_ANIMATION_DELAY_MS);
                }
            });
        };

        // Run immediately on mount (handles grimoires that expired while app was closed)
        check();

        const timer = setInterval(check, GRIMOIRE_EXPIRY_POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally stable, reads store directly
}
