/**
 * LexiCardChromeCyberpunk.ts
 *
 * Cyberpunk persona custom element.
 * Registered tag: <lexi-card-chrome-cyberpunk>
 *
 * IMPORTANT: Do NOT import this module directly from product code.
 * Use registry.ts → ensurePersonaRegistered('cyberpunk') instead.
 * Direct import bypasses the idempotency guard and triggers a duplicate-define error
 * if the module is ever evaluated more than once in the same browsing context.
 */

import { LexiCardChromeBase } from './LexiCardChromeBase';
import templateHTML from './templates/cyberpunk.template.html?raw';

export class LexiCardChromeCyberpunk extends LexiCardChromeBase {
  protected readonly personaId = 'cyberpunk' as const;
  protected readonly templateHTML = templateHTML;
}
