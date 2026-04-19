import { VisualEntry } from '../../schemas/schemas/SenseEntity.schema';

/**
 * Visual Registry
 * 
 * Central singleton for managing visual payloads decoupled from SenseEntities.
 * Handles registration, retrieval, and potential future async fetching of visual data.
 */
class VisualRegistry {
    private static instance: VisualRegistry;

    // Map<uid, Map<variantId, VisualEntry>>
    private registry: Map<string, Map<string, VisualEntry>> = new Map();

    private constructor() { }

    public static getInstance(): VisualRegistry {
        if (!VisualRegistry.instance) {
            VisualRegistry.instance = new VisualRegistry();
        }
        return VisualRegistry.instance;
    }

    /**
     * Register a single visual entry.
     * Overwrites existing entry if same UID and Variant ID.
     */
    public register(entry: VisualEntry): void {
        if (!entry.uid || !entry.id) {
            return;
        }

        if (!this.registry.has(entry.uid)) {
            this.registry.set(entry.uid, new Map());
        }

        const senseVisuals = this.registry.get(entry.uid)!;
        senseVisuals.set(entry.id, entry);

    }

    /**
     * Bulk register visuals.
     */
    public registerBatch(entries: VisualEntry[]): void {
        entries.forEach(entry => this.register(entry));
    }



    /**
     * Retrieve a specific visual variant.
     */
    public get(uid: string, variantId: string = 'default'): VisualEntry | undefined {
        const senseVisuals = this.registry.get(uid);
        if (!senseVisuals) return undefined;

        return senseVisuals.get(variantId);
    }

    /**
     * Get the "best" available visual (Default -> First Available -> Undefined)
     */
    public getBestMatch(uid: string): VisualEntry | undefined {
        const senseVisuals = this.registry.get(uid);
        if (!senseVisuals || senseVisuals.size === 0) return undefined;

        // Try default
        if (senseVisuals.has('default')) {
            return senseVisuals.get('default');
        }

        // Return first available (iterator)
        return senseVisuals.values().next().value;
    }

    /**
     * Check if registry has any visuals for this UID.
     */
    public has(uid: string): boolean {
        return this.registry.has(uid) && this.registry.get(uid)!.size > 0;
    }

    /**
     * Clear registry (useful for testing or full resets)
     */
    public clear(): void {
        this.registry.clear();
    }
}

export const visualRegistry = VisualRegistry.getInstance();
