/**
 * LexiCompactCardCyberpunk.ts
 *
 * Cyberpunk persona compact card custom element.
 * Registered tag: <lexi-compact-card-cyberpunk>
 *
 * Do NOT import directly — use registry.ts → ensureCompactCardRegistered('cyberpunk').
 */

import { LexiCompactCardBase } from './LexiCompactCardBase';
import templateHTML from './templates/compact-cyberpunk.template.html?raw';

export class LexiCompactCardCyberpunk extends LexiCompactCardBase {
  protected readonly personaId = 'cyberpunk' as const;
  protected readonly templateHTML = templateHTML;
}
