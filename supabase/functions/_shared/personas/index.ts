/**
 * personas/index.ts — Persona 字典汇总
 *
 * 新增 Persona 步骤：
 *   1. 创建 ./NEW_PERSONA.ts（参照现有文件）
 *   2. 在此文件 import 并加入 PERSONA_DICTIONARY
 */

import { CHILD }     from './CHILD.ts';
import { GARDENER }  from './GARDENER.ts';
import { ALCHEMIST } from './ALCHEMIST.ts';
import type { PersonaDefinition } from './types.ts';

export const PERSONA_DICTIONARY: Record<string, PersonaDefinition> = {
    CHILD,
    GARDENER,
    ALCHEMIST,
};

export type { PersonaDefinition, PersonaBaseDirectives, PersonaStageOverride } from './types.ts';
