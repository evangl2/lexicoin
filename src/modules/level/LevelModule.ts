/**
 * LevelModule - 等级与进度系统（中控模块）
 * 
 * 职责：
 * 1. 作为 MessageBus 的主要订阅者，监听游戏行为并触发业务逻辑。
 * 2. 协调 XPRegistry, PlayerLevelSystem, DurabilitySystem。
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { useGameStore } from '@core/store';
import { xpRegistry } from '@core/services/XPRegistry';
import { durabilitySystem } from '@core/services/DurabilitySystem';
import type { Language, Sense, CEFRLevel } from '@/types/index';

class LevelModule {
    private static instance: LevelModule;
    private isInitialized: boolean = false;

    private constructor() {
        // 构造函数保持轻量
    }

    static getInstance(): LevelModule {
        if (!LevelModule.instance) {
            LevelModule.instance = new LevelModule();
        }
        return LevelModule.instance;
    }

    /**
     * 系统初始化：设置全局消息监听
     * 建议在 App 根组件加载或主循环启动时调用一次
     */
    public initialize(): void {
        if (this.isInitialized) return;
        
        this.setupSubscriptions();
        this.isInitialized = true;
        
        logger.info('LevelModule Orchestrator Initialized', undefined, 'LevelModule');
    }

    /**
     * 设置消息总线订阅
     */
    private setupSubscriptions(): void {
        // --- 1. 自动发放 XP ---
        
        // 当新感知（Sense）被创建时（通常是合成成功）
        messageBus.subscribe<any>('SENSE_CREATED', async (message) => {
            const sense = message.payload as any;
            const learningLang = useGameStore.getState().player.settings.learningLang;

            // A. 发放 XP
            await xpRegistry.awardXP(learningLang, 'SENSE_COLLECTED', { 
                cefrLevel: sense.level 
            });

            // B. 注册到库存（初始化耐久度）
            await durabilitySystem.registerNewCard(sense.uid || sense.id, learningLang);
        });

        // --- 2. 自动扣除耐久 ---

        // 当合成请求发起时
        messageBus.subscribe<any>('SYNTHESIS_REQUEST', async (message) => {
            const { inputs } = message.payload; // UUID[]
            if (inputs && inputs.length > 0) {
                await durabilitySystem.consumeOnSynthesis(inputs);
            }
        });

        // --- 3. 进化成功奖励 ---
        messageBus.subscribe<any>('EVOLUTION_RESPONSE', async (message) => {
            const result = message.payload;
            if (result.outcome === 'SUCCESS' && result.evolvedSense) {
                const learningLang = useGameStore.getState().player.settings.learningLang;
                await xpRegistry.awardXP(learningLang, 'EVOLUTION_SUCCESS', {
                    cefrLevel: result.evolvedSense.level
                });
            }
        });

        // --- 4. 连签检查（预留示例） ---
        messageBus.subscribe<any>('MODULE_INITIALIZED', async (message) => {
            if (message.payload.moduleId === 'Auth') {
                // TODO: 触发每日连签检查
            }
        });
    }

    /**
     * 手动触发 XP 奖励（供调试或脚本使用）
     */
    public async bonusXP(amount: number, reason: string = 'BONUS'): Promise<void> {
        const lang = useGameStore.getState().player.settings.learningLang;
        // 实际上 XPRegistry 现在是单例，也可以直接调
        await xpRegistry.awardXP(lang, 'DEBUG'); 
    }
}

// 导出单例
export const levelModule = LevelModule.getInstance();
export default levelModule;
