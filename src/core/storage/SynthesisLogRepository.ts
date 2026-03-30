/**
 * SynthesisLogRepository — 合成日志 CRUD
 *
 * 记录每次合成成功后的完整信息。
 * 只增（append-only）——日志永不删除、永不修改。
 * 是魔典系统的唯一数据源。
 */

import { db } from './db';
import type { SynthesisLogRecord } from './db';
import type { Language } from '@/types/index';

/** 生成 UUID（使用浏览器内置方法） */
function generateUUID(): string {
    return crypto.randomUUID();
}

class SynthesisLogRepository {
    /**
     * 写入一条合成日志（自动生成 UUID id）
     * @param log 除 id 字段以外的所有字段
     */
    async write(log: Omit<SynthesisLogRecord, 'id'>): Promise<void> {
        const record: SynthesisLogRecord = {
            ...log,
            id: generateUUID(),
        };
        await db.synthesisLog.add(record);
    }

    /**
     * 查询合成出某个结果词的所有日志（即该词是如何合成出来的）
     */
    async getByResult(resultUid: string): Promise<SynthesisLogRecord[]> {
        return db.synthesisLog.where('resultUid').equals(resultUid).toArray();
    }

    /**
     * 查询某语言下的所有合成记录
     */
    async getByLanguage(language: Language): Promise<SynthesisLogRecord[]> {
        return db.synthesisLog.where('language').equals(language).toArray();
    }

    /**
     * 查询某个配方（顺序无关）——同时匹配 (input1, input2) 和 (input2, input1)
     * 返回第一条匹配记录，不存在则返回 undefined
     */
    async getRecipe(input1Uid: string, input2Uid: string): Promise<SynthesisLogRecord | undefined> {
        // 先查正向
        const forward = await db.synthesisLog
            .where('input1Uid')
            .equals(input1Uid)
            .and(record => record.input2Uid === input2Uid)
            .first();

        if (forward) return forward;

        // 再查反向
        const backward = await db.synthesisLog
            .where('input2Uid')
            .equals(input1Uid)
            .and(record => record.input1Uid === input2Uid)
            .first();

        return backward;
    }

    /**
     * 获取全部合成日志（用于导出）
     */
    async getAll(): Promise<SynthesisLogRecord[]> {
        return db.synthesisLog.toArray();
    }

    /**
     * 统计合成日志总数
     */
    async count(): Promise<number> {
        return db.synthesisLog.count();
    }
}

export const synthesisLogRepository = new SynthesisLogRepository();
