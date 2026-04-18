/**
 * createPersonaStorySlice.ts — 叙事阶段状态切片
 *
 * 职责：持久化每个 Persona 当前所处的叙事阶段（personaStory.stage）。
 * 前端在每次调用 generate-grimoire / evaluate-grimoire 时将此值作为
 * personaStory: { stage } 传入，供后端 resolvePersonaContext 选取对应 override。
 *
 * 设计原则：
 *   - 仅存 stage 字符串；mood（RESERVED）不持久化，由游戏事件层按需注入。
 *   - 初始值均为 'startingpoint'（对应后端 base 指令，无 stage override）。
 *   - 未来叙事推进逻辑（故事事件 → setPersonaStage）在此切片扩展，不污染主 store。
 */

import type { StateCreator } from 'zustand';
import type { PersonaType } from '../../../types/index';

// ── State & Actions ───────────────────────────────────────────────────────────

export interface PersonaStoryState {
    /**
     * 每个 Persona 当前所处的叙事阶段标识符。
     * 'startingpoint' = 默认初始状态，对应后端 base 指令（无 override）。
     * 未来示例：'chapter2_exile'、'arc3_threshold'。
     */
    personaStages: Record<PersonaType, string>;

    /**
     * 推进指定 Persona 到新的叙事阶段。
     * 由游戏事件（里程碑达成、剧情触发等）调用。
     */
    setPersonaStage: (personaId: PersonaType, stage: string) => void;
}

// ── Slice Factory ─────────────────────────────────────────────────────────────

export const createPersonaStorySlice: StateCreator<PersonaStoryState> = (set) => ({
    personaStages: {
        CHILD:     'startingpoint',
        GARDENER:  'startingpoint',
        ALCHEMIST: 'startingpoint',
    },

    setPersonaStage: (personaId, stage) =>
        set((state) => ({
            personaStages: { ...state.personaStages, [personaId]: stage },
        })),
});
