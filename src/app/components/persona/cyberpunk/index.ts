/**
 * CYBERPUNK PERSONA
 * 
 * Cyberpunk Style Skin - Used for demonstrating hot-swapping functionality
 * 
 * Features:
 * - Neon Green/Cyan Palette
 * - Sharp Edges
 * - Scanline Effects
 */

import type { PartialPersonaBundle } from '@/app/types/persona.types';
import { CyberpunkDigitalField } from './visuals/canvas/CyberpunkDigitalField';
import { CyberpunkGridSystem } from './visuals/canvas/CyberpunkGridSystem';
import { CyberpunkCircuitry } from './visuals/canvas/CyberpunkCircuitry';
import { CyberpunkCornerHUD } from './visuals/canvas/CyberpunkCornerHUD';

export const CyberpunkPersona: PartialPersonaBundle = {
    card: {
        identity: {
            name: 'cyberpunk',
            displayName: '赛博朋克',
            theme: 'Neon',
            version: '1.0.0',
        },
        palette: {
            colors: {
                // Neon Green/Cyan Theme - Using correct property names
                primary: '#00FF88',
                primaryDark: '#00AA55',
                primaryLight: '#88FFBB',
                accent: '#00FFFF',

                // Background Colors
                bgVoid: '#000808',
                bgBase: 'rgba(0, 20, 20, 0.95)',
                bgSurface: 'rgba(0, 30, 30, 0.9)',
                bgElevated: 'rgba(0, 40, 40, 0.85)',
                bgOverlay: 'rgba(0, 255, 136, 0.1)',
                bgGlass: 'rgba(0, 255, 136, 0.05)',

                // Text Colors
                textPrimary: '#00FF88',
                textSecondary: '#00DDDD',
                textMuted: '#006666',
                textHighlight: '#00FFFF',
                textOnPrimary: '#000000',

                // Border Colors
                borderStrong: '#00FF88',
                borderBase: 'rgba(0, 255, 136, 0.5)',
                borderSubtle: 'rgba(0, 255, 136, 0.3)',
                borderFaint: 'rgba(0, 255, 136, 0.15)',
            },
            gradients: {
                // Neon Gradients - Using correct property names
                primary: 'linear-gradient(135deg, #00FF88 0%, #00DDFF 100%)',
                text: 'linear-gradient(180deg, #00FF88 0%, #00FFFF 100%)',
                sheen: 'linear-gradient(115deg, transparent 30%, rgba(0,255,255,0.3) 50%, transparent 70%)',
                backdrop: 'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.2) 0%, transparent 70%)',
                radialSubtle: 'radial-gradient(circle at 50% 0%, rgba(0,255,136,0.4) 0%, transparent 60%)',
            },
        },
        // Disable some traditional decorations for a cleaner look
        slots: {
            Corners: null,  // Disable corner decorations
        },
    },
    canvas: {
        identity: {
            name: 'cyberpunk',
            displayName: '赛博朋克画布',
            version: '1.0.0',
        },
        palette: {
            colors: {
                primary: '#00FF88',
                primaryDark: '#00AA55',
                primaryLight: '#88FFBB',
                accent: '#00FFFF',
                bgVoid: '#000808',
                bgBase: '#001010',
                bgSurface: '#001818',
                bgElevated: '#002020',
                bgOverlay: 'rgba(0, 255, 136, 0.1)',
                bgGlass: 'rgba(0, 255, 136, 0.05)',
                textPrimary: '#00FF88',
                textSecondary: '#00DDDD',
                textMuted: '#006666',
                textHighlight: '#00FFFF',
                textOnPrimary: '#000000',
                borderStrong: '#00FF88',
                borderBase: 'rgba(0, 255, 136, 0.4)',
                borderSubtle: 'rgba(0, 255, 136, 0.25)',
                borderFaint: 'rgba(0, 255, 136, 0.1)',
            },
        },
        slots: {
            VoidAtmosphere: CyberpunkDigitalField,
            GridSystem: CyberpunkGridSystem,
            TransmutationCircle: CyberpunkCircuitry,
            CornerRune: CyberpunkCornerHUD,

            // Disable legacy alchemy visuals
            MetalTexture: null,
            ScriptNoise: null,
            SacredGeometry: null,
            CornerGears: null,
            EdgeRunes: null,
            InnerMechanics: null,
        },
    },
    interface: {
        identity: {
            name: 'cyberpunk',
            displayName: '赛博朋克界面',
            version: '1.0.0',
        },
        palette: {
            colors: {
                primary: '#00FF88',
                primaryDark: '#00AA55',
                primaryLight: '#88FFBB',
                accent: '#00FFFF',
                bgVoid: '#000808',
                bgBase: 'rgba(0, 20, 20, 0.95)',
                bgSurface: 'rgba(0, 30, 30, 0.9)',
                bgElevated: 'rgba(0, 40, 40, 0.85)',
                bgOverlay: 'rgba(0, 255, 136, 0.1)',
                bgGlass: 'rgba(0, 255, 136, 0.05)',
                textPrimary: '#00FF88',
                textSecondary: '#00DDDD',
                textMuted: '#006666',
                textHighlight: '#00FFFF',
                textOnPrimary: '#000000',
                borderStrong: '#00FF88',
                borderBase: 'rgba(0, 255, 136, 0.4)',
                borderSubtle: 'rgba(0, 255, 136, 0.25)',
                borderFaint: 'rgba(0, 255, 136, 0.1)',
            },
        },
        dock: {
            style: {
                blurStrength: '4px',
                rimInset: 'inset 0 1px 0 0 rgba(0, 255, 255, 0.3)',
                accentInset: 'inset 0 0 20px 0 rgba(0, 255, 255, 0.2)',
                sideAccentWidth: '4px',
                sideAccentHeight: '80%',
                radialOpacity: 0.2,
            }
        },
    },
};
