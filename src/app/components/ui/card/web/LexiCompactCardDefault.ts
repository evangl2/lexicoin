/**
 * LexiCompactCardDefault.ts
 *
 * Default (Alchemy) persona compact card custom element.
 * Registered tag: <lexi-compact-card-default>
 *
 * Do NOT import directly — use registry.ts → ensureCompactCardRegistered('default').
 */

import { LexiCompactCardBase } from './LexiCompactCardBase';
import templateHTML from './templates/compact-default.template.html?raw';

export class LexiCompactCardDefault extends LexiCompactCardBase {
  protected readonly personaId = 'default' as const;
  protected readonly templateHTML = templateHTML;
}
