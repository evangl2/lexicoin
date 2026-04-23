import { GrimoireStatus } from '@/types/index';

/**
 * GrimoirePersonaBundle
 * 
 * Standard interface for Grimoire skins.
 * Each persona (Default, Child, Gardener) implements this bundle.
 */
export interface GrimoirePersonaBundle {
    identity: {
        id: string;
        name: string;
        theme: string;
    };
    
    tokens: {
        colors: {
            // Book Cover
            coverBase: string;
            coverBorder: string;
            spineBase: string;
            spineLines: string;
            
            // Status-specific (Overrides for the book glow/border)
            status: Record<GrimoireStatus, string>;
            
            // Internal Pages
            pageBg: string;
            pageBorder: string;
            textPrimary: string;
            textSecondary: string;
            textAccent: string;
            
            // Slots
            slotBg: string;
            slotBorder: string;
            slotActive: string;
            
            // Stamps
            stampS: string;
            stampA: string;
            stampB: string;
            stampC: string;
            stampD: string;
            stampF: string;
        };
        
        shadows: {
            book: string;
            overlay: string;
            stamp: string;
        };
        
        typography: {
            titleFamily: string;
            bodyFamily: string;
            handwritingFamily: string; // Used for Persona commentary
        };
    };
    
    visuals: {
        // Cover Decoration (e.g., Alchemical symbols, child stickers, leaves)
        CoverDecoration: React.FC<{ status: GrimoireStatus }>;
        // Page Texture (e.g., parchment, notebook paper, pressed flower paper)
        PageTexture: React.FC;
        // Divider (Separator between header and slots)
        Divider: React.FC;
        // Narrative Decoration (Background elements for the left page)
        NarrativeVisuals: React.FC;
    };
}
