/**
 * Workbench - Main Game Area
 * 
 * The primary workspace where permanent nodes are placed
 * Simulates a desk/table surface
 */

import React from 'react';
import { useGameStore } from '@store/index';
import { WorkbenchNode } from './WorkbenchNode';

interface WorkbenchProps {
    children?: React.ReactNode;
}

export const Workbench: React.FC<WorkbenchProps> = ({ children }) => {
    const openDeck = useGameStore(state => state.openDeck);
    const closeDeck = useGameStore(state => state.closeDeck);
    const deckState = useGameStore(state => state.deckState);

    const handleWorkbenchClick = (e: React.MouseEvent) => {
        // Close deck if clicking on workbench background (not on nodes)
        if (e.target === e.currentTarget && deckState.isOpen) {
            closeDeck();
        }
    };

    return (
        <div
            className="relative w-full h-full overflow-hidden"
            onClick={handleWorkbenchClick}
            style={{
                background: `
                    linear-gradient(135deg, #1a120f 0%, #271c19 50%, #1a120f 100%),
                    url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')
                `,
                backgroundBlendMode: 'overlay',
            }}
        >
            {/* Ambient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

            {/* Vignette effect */}
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none" />

            {/* Main content area */}
            <div className="relative w-full h-full">
                {children}
            </div>

            {/* Permanent Workbench Nodes */}
            <WorkbenchNode
                label="Archive"
                icon="📚"
                position="left"
                onClick={() => openDeck('archive')}
            />

            <WorkbenchNode
                label="Items"
                icon="🎒"
                position="right"
                onClick={() => openDeck('items')}
            />
        </div>
    );
};
