/**
 * Grimoire.tsx (Container)
 * 
 * 职责：管理魔典在 Canvas 上的状态和逻辑。
 * 1. 接入拖拽逻辑 (useGrimoireDrop)。
 * 2. 处理打开魔典的交互。
 * 3. 渲染 GrimoireVisual。
 */

import React from 'react';
import { MotionValue } from 'motion/react';
import { GrimoireEntity } from '@/types/index';
import { useGameStore } from '@/core/store';
import { useGrimoireDrop } from '@/app/hooks/useGrimoireDrop';
import { GrimoireVisual } from './GrimoireVisual';

interface GrimoireProps {
    grimoire: GrimoireEntity;
    x: number | MotionValue<number>;
    y: number | MotionValue<number>;
    canvasScale?: MotionValue<number>;
    isLibraryView?: boolean;
}

export const Grimoire: React.FC<GrimoireProps> = ({ 
    grimoire, 
    x, 
    y, 
    isLibraryView = false 
}) => {
    const setActiveGrimoireId = useGameStore(s => s.setActiveGrimoireId);
    
    const isOpenable = grimoire.status !== 'SUMMONING' && !isLibraryView;
    const isEvaluating = grimoire.status === 'EVALUATING';

    // 接入魔典级拖放逻辑
    const { dropRef, isOver, canDrop } = useGrimoireDrop({
        grimoireId: grimoire.id,
        slots: grimoire.slots,
        isOpenable,
        isEvaluating
    });

    const handleOpen = () => {
        if (!isOpenable) return;
        setActiveGrimoireId(grimoire.id);
    };

    return (
        <GrimoireVisual
            grimoire={grimoire}
            isLibraryView={isLibraryView}
            isOver={isOver}
            canDrop={canDrop}
            dropRef={dropRef as any}
            x={x}
            y={y}
            onOpen={handleOpen}
        />
    );
};
