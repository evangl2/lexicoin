/**
 * ItemModule - Item System & Inventory Management
 * 
 * Manages items, inventory, item usage, and evolution/conversion logic
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { generateId } from '@utils/helpers';
import type { UUID, LocalizedText } from '../../types/index';

export type ItemType = 'CONSUMABLE' | 'TOOL' | 'MATERIAL' | 'SPECIAL';
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Item {
    id: string;  // Item definition ID (not instance)
    name: LocalizedText;
    description: LocalizedText;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;  // Asset path or emoji
    maxStack: number;
    effects?: {
        type: string;
        value: number;
        duration?: number;  // milliseconds
    }[];
}

export interface InventoryItem {
    itemId: string;  // Reference to Item.id
    instanceId: UUID;  // Unique instance ID
    quantity: number;
    acquiredAt: number;
}

export interface ItemUsageResult {
    success: boolean;
    message: LocalizedText;
    effects?: {
        type: string;
        applied: boolean;
        value: number;
    }[];
}

class ItemModule {
    private static instance: ItemModule;
    private itemDefinitions: Map<string, Item>;
    private inventory: Map<UUID, InventoryItem>;

    private constructor() {
        this.itemDefinitions = this.initializeItems();
        this.inventory = new Map();
        logger.info('ItemModule initialized', undefined, 'ItemModule');
    }

    static getInstance(): ItemModule {
        if (!ItemModule.instance) {
            ItemModule.instance = new ItemModule();
        }
        return ItemModule.instance;
    }

    /**
     * Initialize item definitions
     */
    private initializeItems(): Map<string, Item> {
        const items: Item[] = [
            {
                id: 'evolution_prism',
                name: { en: 'Evolution Prism', zh: '进化棱镜' },
                description: {
                    en: 'Evolves a worn word into a higher form',
                    zh: '将磨损的词汇进化为更高级的形式'
                },
                type: 'CONSUMABLE',
                rarity: 'RARE',
                icon: '🔮',
                maxStack: 5,
                effects: [
                    { type: 'EVOLVE_SENSE', value: 1 },
                ],
            },
            {
                id: 'synthesis_catalyst',
                name: { en: 'Synthesis Catalyst', zh: '合成催化剂' },
                description: {
                    en: 'Increases synthesis success rate',
                    zh: '提高合成成功率'
                },
                type: 'CONSUMABLE',
                rarity: 'UNCOMMON',
                icon: '⚗️',
                maxStack: 10,
                effects: [
                    { type: 'BOOST_SUCCESS_RATE', value: 0.2, duration: 300000 },  // 5 minutes
                ],
            },
            {
                id: 'memory_fragment',
                name: { en: 'Memory Fragment', zh: '记忆碎片' },
                description: {
                    en: 'Restores durability to a sense',
                    zh: '恢复词义的耐久度'
                },
                type: 'CONSUMABLE',
                rarity: 'COMMON',
                icon: '✨',
                maxStack: 20,
                effects: [
                    { type: 'RESTORE_DURABILITY', value: 20 },
                ],
            },
            {
                id: 'resonance_crystal',
                name: { en: 'Resonance Crystal', zh: '共鸣水晶' },
                description: {
                    en: 'Grants resonance with a persona',
                    zh: '赋予与人格的共鸣'
                },
                type: 'CONSUMABLE',
                rarity: 'EPIC',
                icon: '💎',
                maxStack: 3,
                effects: [
                    { type: 'GRANT_RESONANCE', value: 10 },
                ],
            },
            {
                id: 'lexicon_key',
                name: { en: 'Lexicon Key', zh: '词典钥匙' },
                description: {
                    en: 'Unlocks a random rare word',
                    zh: '解锁一个随机稀有词汇'
                },
                type: 'SPECIAL',
                rarity: 'LEGENDARY',
                icon: '🗝️',
                maxStack: 1,
                effects: [
                    { type: 'UNLOCK_RARE_SENSE', value: 1 },
                ],
            },
        ];

        const map = new Map<string, Item>();
        for (const item of items) {
            map.set(item.id, item);
        }

        return map;
    }

    /**
     * Get item definition
     */
    getItemDefinition(itemId: string): Item | undefined {
        return this.itemDefinitions.get(itemId);
    }

    /**
     * Get all item definitions
     */
    getAllItemDefinitions(): Item[] {
        return Array.from(this.itemDefinitions.values());
    }

    /**
     * Get inventory
     */
    getInventory(): InventoryItem[] {
        return Array.from(this.inventory.values());
    }

    /**
     * Get inventory item by instance ID
     */
    getInventoryItem(instanceId: UUID): InventoryItem | undefined {
        return this.inventory.get(instanceId);
    }

    /**
     * Get inventory items by item ID
     */
    getInventoryItemsByType(itemId: string): InventoryItem[] {
        return Array.from(this.inventory.values()).filter(
            item => item.itemId === itemId
        );
    }

    /**
     * Add item to inventory
     */
    async addItem(itemId: string, quantity: number = 1): Promise<InventoryItem | undefined> {
        const itemDef = this.itemDefinitions.get(itemId);
        if (!itemDef) {
            logger.warn(`Item definition not found: ${itemId}`, undefined, 'ItemModule');
            return undefined;
        }

        // Check if we can stack with existing item
        const existing = Array.from(this.inventory.values()).find(
            item => item.itemId === itemId && item.quantity < itemDef.maxStack
        );

        if (existing) {
            const addAmount = Math.min(quantity, itemDef.maxStack - existing.quantity);
            existing.quantity += addAmount;
            quantity -= addAmount;

            await messageBus.send('ITEM_ADDED', existing, 'ItemModule');
            logger.debug(`Added ${addAmount} ${itemId} to existing stack`, undefined, 'ItemModule');

            if (quantity === 0) {
                return existing;
            }
        }

        // Create new inventory item
        const inventoryItem: InventoryItem = {
            itemId,
            instanceId: generateId(),
            quantity: Math.min(quantity, itemDef.maxStack),
            acquiredAt: Date.now(),
        };

        this.inventory.set(inventoryItem.instanceId, inventoryItem);

        await messageBus.send('ITEM_ADDED', inventoryItem, 'ItemModule');
        logger.info(`Added item to inventory: ${itemId} x${quantity}`, undefined, 'ItemModule');

        return inventoryItem;
    }

    /**
     * Remove item from inventory
     */
    async removeItem(instanceId: UUID, quantity: number = 1): Promise<boolean> {
        const item = this.inventory.get(instanceId);
        if (!item) {
            logger.warn(`Inventory item not found: ${instanceId}`, undefined, 'ItemModule');
            return false;
        }

        if (item.quantity <= quantity) {
            this.inventory.delete(instanceId);
            await messageBus.send('ITEM_REMOVED', { instanceId, itemId: item.itemId }, 'ItemModule');
            logger.debug(`Removed item from inventory: ${item.itemId}`, undefined, 'ItemModule');
        } else {
            item.quantity -= quantity;
            await messageBus.send('ITEM_QUANTITY_CHANGED', item, 'ItemModule');
            logger.debug(`Reduced item quantity: ${item.itemId} -${quantity}`, undefined, 'ItemModule');
        }

        return true;
    }

    /**
     * Use an item
     */
    async useItem(instanceId: UUID, targetId?: UUID): Promise<ItemUsageResult> {
        const inventoryItem = this.inventory.get(instanceId);
        if (!inventoryItem) {
            return {
                success: false,
                message: { en: 'Item not found in inventory', zh: '物品不在背包中' },
            };
        }

        const itemDef = this.itemDefinitions.get(inventoryItem.itemId);
        if (!itemDef) {
            return {
                success: false,
                message: { en: 'Item definition not found', zh: '物品定义未找到' },
            };
        }

        // Validate usage
        const validation = this.validateItemUsage(itemDef, targetId);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.message!,
            };
        }

        // Apply effects
        const effects = await this.applyItemEffects(itemDef, targetId);

        // Consume item if it's consumable
        if (itemDef.type === 'CONSUMABLE') {
            await this.removeItem(instanceId, 1);
        }

        await messageBus.send('ITEM_USED', {
            itemId: itemDef.id,
            targetId,
            effects,
        }, 'ItemModule');

        logger.info(`Item used: ${itemDef.name.en}`, { targetId, effects }, 'ItemModule');

        return {
            success: true,
            message: {
                en: `Used ${itemDef.name.en}`,
                zh: `使用了${itemDef.name.zh}`
            },
            effects,
        };
    }

    /**
     * Validate item usage
     */
    private validateItemUsage(item: Item, targetId?: UUID): { valid: boolean; message?: LocalizedText } {
        // Check if item requires a target
        const requiresTarget = item.effects?.some(e =>
            ['EVOLVE_SENSE', 'RESTORE_DURABILITY'].includes(e.type)
        );

        if (requiresTarget && !targetId) {
            return {
                valid: false,
                message: {
                    en: 'This item requires a target',
                    zh: '此物品需要目标'
                },
            };
        }

        return { valid: true };
    }

    /**
     * Apply item effects
     */
    private async applyItemEffects(item: Item, targetId?: UUID): Promise<ItemUsageResult['effects']> {
        if (!item.effects) return [];

        const results = [];

        for (const effect of item.effects) {
            // Effects will be handled by other modules via MessageBus
            // This is just a placeholder for the effect application logic
            results.push({
                type: effect.type,
                applied: true,
                value: effect.value,
            });
        }

        return results;
    }

    /**
     * Load inventory
     */
    loadInventory(items: InventoryItem[]): void {
        for (const item of items) {
            this.inventory.set(item.instanceId, item);
        }
        logger.info(`Loaded ${items.length} inventory items`, undefined, 'ItemModule');
    }

    /**
     * Clear inventory
     */
    clear(): void {
        this.inventory.clear();
        logger.info('Inventory cleared', undefined, 'ItemModule');
    }
}

// Export singleton instance
export const itemModule = ItemModule.getInstance();
export default itemModule;
