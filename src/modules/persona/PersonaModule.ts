/**
 * PersonaModule - Grimoire & Narrative Engine
 * 
 * Manages personas (Logician, Poet, Alchemist), task publishing,
 * resonance tracking, and narrative progression
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { generateId } from '@utils/helpers';
import type { UUID, LocalizedText, CEFRLevel } from '../../types/index';

export type PersonaType = 'LOGICIAN' | 'POET' | 'ALCHEMIST' | 'MYSTIC';

export interface Persona {
    id: PersonaType;
    name: LocalizedText;
    description: LocalizedText;
    themeColors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    unlockedAt: number;  // Player level required
    resonance: number;  // 0-100
}

export interface PersonaTask {
    id: UUID;
    personaId: PersonaType;
    title: LocalizedText;
    description: LocalizedText;
    requirements: {
        type: 'SYNTHESIS' | 'CONSTRUCTION' | 'COLLECTION';
        target: string;  // What needs to be done
        count?: number;  // How many times
    }[];
    rewards: {
        resonance: number;
        xp: number;
        items?: string[];
    };
    difficulty: CEFRLevel;
    status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
    progress: number;  // 0-1
    createdAt: number;
    completedAt?: number;
}

export interface NarrativeState {
    currentChapter: number;
    unlockedPersonas: PersonaType[];
    activePersona?: PersonaType;
    completedTasks: UUID[];
}

class PersonaModule {
    private static instance: PersonaModule;
    private personas: Map<PersonaType, Persona>;
    private tasks: Map<UUID, PersonaTask>;
    private narrativeState: NarrativeState;

    private constructor() {
        this.personas = this.initializePersonas();
        this.tasks = new Map();
        this.narrativeState = {
            currentChapter: 1,
            unlockedPersonas: [],
            completedTasks: [],
        };
        logger.info('PersonaModule initialized', undefined, 'PersonaModule');
    }

    static getInstance(): PersonaModule {
        if (!PersonaModule.instance) {
            PersonaModule.instance = new PersonaModule();
        }
        return PersonaModule.instance;
    }

    /**
     * Initialize persona definitions
     */
    private initializePersonas(): Map<PersonaType, Persona> {
        const personas: Persona[] = [
            {
                id: 'LOGICIAN',
                name: { en: 'The Logician', zh: '逻辑学家' },
                description: {
                    en: 'Master of reason and structure',
                    zh: '理性与结构的大师'
                },
                themeColors: {
                    primary: '#3b82f6',  // Blue
                    secondary: '#1e40af',
                    accent: '#60a5fa',
                },
                unlockedAt: 3,
                resonance: 0,
            },
            {
                id: 'POET',
                name: { en: 'The Poet', zh: '诗人' },
                description: {
                    en: 'Weaver of beauty and emotion',
                    zh: '美与情感的编织者'
                },
                themeColors: {
                    primary: '#ec4899',  // Pink
                    secondary: '#be185d',
                    accent: '#f9a8d4',
                },
                unlockedAt: 7,
                resonance: 0,
            },
            {
                id: 'ALCHEMIST',
                name: { en: 'The Alchemist', zh: '炼金术士' },
                description: {
                    en: 'Transmuter of meaning and form',
                    zh: '意义与形式的转化者'
                },
                themeColors: {
                    primary: '#f59e0b',  // Amber
                    secondary: '#b45309',
                    accent: '#fbbf24',
                },
                unlockedAt: 12,
                resonance: 0,
            },
            {
                id: 'MYSTIC',
                name: { en: 'The Mystic', zh: '神秘学家' },
                description: {
                    en: 'Seeker of hidden truths',
                    zh: '隐秘真理的探寻者'
                },
                themeColors: {
                    primary: '#8b5cf6',  // Purple
                    secondary: '#6d28d9',
                    accent: '#a78bfa',
                },
                unlockedAt: 20,
                resonance: 0,
            },
        ];

        const map = new Map<PersonaType, Persona>();
        for (const persona of personas) {
            map.set(persona.id, persona);
        }

        return map;
    }

    /**
     * Get all personas
     */
    getAllPersonas(): Persona[] {
        return Array.from(this.personas.values());
    }

    /**
     * Get a specific persona
     */
    getPersona(id: PersonaType): Persona | undefined {
        return this.personas.get(id);
    }

    /**
     * Get unlocked personas for a player level
     */
    getUnlockedPersonas(playerLevel: number): Persona[] {
        return Array.from(this.personas.values()).filter(
            p => p.unlockedAt <= playerLevel
        );
    }

    /**
     * Set active persona
     */
    async setActivePersona(personaId: PersonaType): Promise<boolean> {
        const persona = this.personas.get(personaId);
        if (!persona) {
            logger.warn(`Persona not found: ${personaId}`, undefined, 'PersonaModule');
            return false;
        }

        this.narrativeState.activePersona = personaId;

        await messageBus.send('PERSONA_ACTIVATED', { personaId }, 'PersonaModule');
        logger.info(`Activated persona: ${personaId}`, undefined, 'PersonaModule');

        return true;
    }

    /**
     * Get active persona
     */
    getActivePersona(): Persona | undefined {
        if (!this.narrativeState.activePersona) return undefined;
        return this.personas.get(this.narrativeState.activePersona);
    }

    /**
     * Update persona resonance
     */
    async updateResonance(personaId: PersonaType, amount: number): Promise<number> {
        const persona = this.personas.get(personaId);
        if (!persona) return 0;

        persona.resonance = Math.max(0, Math.min(100, persona.resonance + amount));

        await messageBus.send('RESONANCE_UPDATED', {
            personaId,
            resonance: persona.resonance,
            change: amount,
        }, 'PersonaModule');

        logger.debug(`Resonance updated for ${personaId}: ${persona.resonance}`, undefined, 'PersonaModule');

        return persona.resonance;
    }

    /**
     * Create a new task
     */
    async createTask(params: Omit<PersonaTask, 'id' | 'status' | 'progress' | 'createdAt'>): Promise<PersonaTask> {
        const task: PersonaTask = {
            ...params,
            id: generateId(),
            status: 'AVAILABLE',
            progress: 0,
            createdAt: Date.now(),
        };

        this.tasks.set(task.id, task);

        await messageBus.send('TASK_CREATED', task, 'PersonaModule');
        logger.info(`Task created: ${task.title.en}`, { id: task.id }, 'PersonaModule');

        return task;
    }

    /**
     * Get all tasks for a persona
     */
    getTasksForPersona(personaId: PersonaType): PersonaTask[] {
        return Array.from(this.tasks.values()).filter(
            t => t.personaId === personaId
        );
    }

    /**
     * Get available tasks
     */
    getAvailableTasks(personaId?: PersonaType): PersonaTask[] {
        return Array.from(this.tasks.values()).filter(
            t => t.status === 'AVAILABLE' && (!personaId || t.personaId === personaId)
        );
    }

    /**
     * Update task progress
     */
    async updateTaskProgress(taskId: UUID, progress: number): Promise<PersonaTask | undefined> {
        const task = this.tasks.get(taskId);
        if (!task) return undefined;

        task.progress = Math.max(0, Math.min(1, progress));

        if (task.progress >= 1 && task.status !== 'COMPLETED') {
            await this.completeTask(taskId);
        } else {
            task.status = task.progress > 0 ? 'IN_PROGRESS' : 'AVAILABLE';
            await messageBus.send('TASK_PROGRESS_UPDATED', task, 'PersonaModule');
        }

        return task;
    }

    /**
     * Complete a task
     */
    async completeTask(taskId: UUID): Promise<PersonaTask | undefined> {
        const task = this.tasks.get(taskId);
        if (!task) return undefined;

        task.status = 'COMPLETED';
        task.progress = 1;
        task.completedAt = Date.now();

        this.narrativeState.completedTasks.push(taskId);

        // Award resonance
        await this.updateResonance(task.personaId, task.rewards.resonance);

        await messageBus.send('TASK_COMPLETED', task, 'PersonaModule');
        logger.info(`Task completed: ${task.title.en}`, {
            id: task.id,
            rewards: task.rewards,
        }, 'PersonaModule');

        return task;
    }

    /**
     * Get narrative state
     */
    getNarrativeState(): NarrativeState {
        return { ...this.narrativeState };
    }

    /**
     * Load narrative state
     */
    loadNarrativeState(state: NarrativeState): void {
        this.narrativeState = state;
        logger.info('Narrative state loaded', state, 'PersonaModule');
    }

    /**
     * Load tasks
     */
    loadTasks(tasks: PersonaTask[]): void {
        for (const task of tasks) {
            this.tasks.set(task.id, task);
        }
        logger.info(`Loaded ${tasks.length} tasks`, undefined, 'PersonaModule');
    }
}

// Export singleton instance
export const personaModule = PersonaModule.getInstance();
export default personaModule;
