/**
 * LexiCardChromeDefault.ts
 *
 * Default (Alchemy) persona custom element.
 * Registered tag: <lexi-card-chrome-default>
 *
 * IMPORTANT: Do NOT import this module directly from product code.
 * Use registry.ts → ensurePersonaRegistered('default') instead.
 * Direct import bypasses the idempotency guard and triggers a duplicate-define error
 * if the module is ever evaluated more than once in the same browsing context.
 */

import { LexiCardChromeBase } from './LexiCardChromeBase';
import templateHTML from './templates/default.template.html?raw';

export class LexiCardChromeDefault extends LexiCardChromeBase {
  protected readonly personaId = 'default' as const;
  protected readonly templateHTML = templateHTML;
}
