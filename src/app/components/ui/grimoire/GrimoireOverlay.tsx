/**
 * GrimoireOverlay.tsx (Container)
 * 
 * 职责：管理魔典评判界面的业务逻辑。
 * 1. 接入 useGrimoireInteraction 处理数据。
 * 2. 管理界面辅助状态（如语言切换）。
 * 3. 渲染 GrimoireOverlayVisual。
 */

import React, { useState } from 'react';
import { useGrimoireInteraction } from '@/app/hooks/useGrimoireInteraction';
import { useGameStore } from '@/core/store';
import { GrimoireOverlayVisual } from './GrimoireOverlayVisual';

export const GrimoireOverlay: React.FC = () => {
    const {
        grimoire,
        submitting,
        error,
        submit,
        close
    } = useGrimoireInteraction();
    
    const archiveGrimoire = useGameStore(s => s.archiveGrimoire);

    // 语言切换状态 (learning / system)
    const [displayLang, setDisplayLang] = useState<'learning' | 'system'>('learning');

    if (!grimoire) return null;

    const grimoireStatus = grimoire.status;
    const isFailing = grimoireStatus === 'NEEDS_REVISION';
    const isEvaluating = grimoireStatus === 'EVALUATING';

    const handleArchive = () => {
        if (grimoire) {
            archiveGrimoire(grimoire.id);
            close();
        }
    };

    const handleToggleLang = () => {
        setDisplayLang(prev => prev === 'learning' ? 'system' : 'learning');
    };

    return (
        <GrimoireOverlayVisual
            grimoire={grimoire}
            displayLang={displayLang}
            submitting={submitting}
            isEvaluating={isEvaluating}
            isFailing={isFailing}
            error={error}
            onClose={close}
            onSubmit={submit}
            onArchive={handleArchive}
            onToggleLang={handleToggleLang}
        />
    );
};
