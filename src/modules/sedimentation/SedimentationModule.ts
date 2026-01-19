/**
 * SedimentationModule - Social Feedback System
 * 
 * Manages upvote/downvote functionality, error reporting,
 * and meta data sync (Stability, First Discoverer)
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import type { UUID, LocalizedText } from '../../types/index';

export type FeedbackType = 'UPVOTE' | 'DOWNVOTE' | 'REPORT';

export interface Feedback {
    id: UUID;
    targetId: UUID;  // ID of the content being rated
    targetType: 'SENSE' | 'CONSTRUCTION' | 'TASK_RESULT';
    type: FeedbackType;
    reason?: string;  // For reports
    createdAt: number;
}

export interface MetaData {
    targetId: UUID;
    stability: number;  // 0-1, calculated from feedback
    upvotes: number;
    downvotes: number;
    reports: number;
    firstDiscoverer?: string;
    usageCount: number;
}

export interface ErrorReport {
    id: UUID;
    targetId: UUID;
    targetType: 'SENSE' | 'CONSTRUCTION' | 'TASK_RESULT';
    category: 'LOGIC_ERROR' | 'FORMAT_ERROR' | 'OFFENSIVE' | 'OTHER';
    description: LocalizedText;
    reportedAt: number;
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
}

class SedimentationModule {
    private static instance: SedimentationModule;
    private feedback: Map<UUID, Feedback>;
    private metaData: Map<UUID, MetaData>;
    private reports: Map<UUID, ErrorReport>;
    private userFeedback: Map<UUID, Set<UUID>>;  // userId -> Set of targetIds they've voted on

    private constructor() {
        this.feedback = new Map();
        this.metaData = new Map();
        this.reports = new Map();
        this.userFeedback = new Map();
        logger.info('SedimentationModule initialized', undefined, 'SedimentationModule');
    }

    static getInstance(): SedimentationModule {
        if (!SedimentationModule.instance) {
            SedimentationModule.instance = new SedimentationModule();
        }
        return SedimentationModule.instance;
    }

    /**
     * Submit feedback (upvote/downvote)
     */
    async submitFeedback(params: {
        userId: UUID;
        targetId: UUID;
        targetType: 'SENSE' | 'CONSTRUCTION' | 'TASK_RESULT';
        type: 'UPVOTE' | 'DOWNVOTE';
    }): Promise<Feedback | undefined> {
        const { userId, targetId, targetType, type } = params;

        // Check if user has already voted on this target
        const userVotes = this.userFeedback.get(userId) || new Set();
        if (userVotes.has(targetId)) {
            logger.warn('User has already voted on this target', { userId, targetId }, 'SedimentationModule');
            return undefined;
        }

        // Create feedback record
        const feedback: Feedback = {
            id: `${userId}_${targetId}_${Date.now()}`,
            targetId,
            targetType,
            type,
            createdAt: Date.now(),
        };

        this.feedback.set(feedback.id, feedback);

        // Track user's vote
        userVotes.add(targetId);
        this.userFeedback.set(userId, userVotes);

        // Update meta data
        await this.updateMetaData(targetId, type);

        await messageBus.send('FEEDBACK_SUBMITTED', feedback, 'SedimentationModule');
        logger.debug(`Feedback submitted: ${type} for ${targetId}`, undefined, 'SedimentationModule');

        return feedback;
    }

    /**
     * Update meta data based on feedback
     */
    private async updateMetaData(targetId: UUID, feedbackType: 'UPVOTE' | 'DOWNVOTE'): Promise<void> {
        let meta = this.metaData.get(targetId);

        if (!meta) {
            meta = {
                targetId,
                stability: 0.5,  // Start at neutral
                upvotes: 0,
                downvotes: 0,
                reports: 0,
                usageCount: 0,
            };
            this.metaData.set(targetId, meta);
        }

        // Update vote counts
        if (feedbackType === 'UPVOTE') {
            meta.upvotes++;
        } else {
            meta.downvotes++;
        }

        // Recalculate stability
        meta.stability = this.calculateStability(meta);

        await messageBus.send('META_DATA_UPDATED', meta, 'SedimentationModule');
        logger.debug(`Meta data updated for ${targetId}`, { stability: meta.stability }, 'SedimentationModule');
    }

    /**
     * Calculate stability score
     */
    private calculateStability(meta: MetaData): number {
        const totalVotes = meta.upvotes + meta.downvotes;

        if (totalVotes === 0) {
            return 0.5;  // Neutral if no votes
        }

        // Wilson score confidence interval for better stability calculation
        const upvoteRatio = meta.upvotes / totalVotes;
        const z = 1.96;  // 95% confidence
        const n = totalVotes;

        const phat = upvoteRatio;
        const stability = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);

        // Penalize for reports
        const reportPenalty = Math.min(meta.reports * 0.1, 0.5);

        return Math.max(0, Math.min(1, stability - reportPenalty));
    }

    /**
     * Submit error report
     */
    async submitReport(params: {
        userId: UUID;
        targetId: UUID;
        targetType: 'SENSE' | 'CONSTRUCTION' | 'TASK_RESULT';
        category: ErrorReport['category'];
        description: LocalizedText;
    }): Promise<ErrorReport> {
        const { userId, targetId, targetType, category, description } = params;

        const report: ErrorReport = {
            id: `${userId}_${targetId}_${Date.now()}`,
            targetId,
            targetType,
            category,
            description,
            reportedAt: Date.now(),
            status: 'PENDING',
        };

        this.reports.set(report.id, report);

        // Update meta data
        const meta = this.metaData.get(targetId);
        if (meta) {
            meta.reports++;
            meta.stability = this.calculateStability(meta);
            await messageBus.send('META_DATA_UPDATED', meta, 'SedimentationModule');
        }

        await messageBus.send('ERROR_REPORTED', report, 'SedimentationModule');
        logger.info(`Error reported for ${targetId}`, { category }, 'SedimentationModule');

        return report;
    }

    /**
     * Get meta data for a target
     */
    getMetaData(targetId: UUID): MetaData | undefined {
        return this.metaData.get(targetId);
    }

    /**
     * Set first discoverer
     */
    async setFirstDiscoverer(targetId: UUID, discoverer: string): Promise<void> {
        let meta = this.metaData.get(targetId);

        if (!meta) {
            meta = {
                targetId,
                stability: 0.5,
                upvotes: 0,
                downvotes: 0,
                reports: 0,
                usageCount: 0,
            };
            this.metaData.set(targetId, meta);
        }

        if (!meta.firstDiscoverer) {
            meta.firstDiscoverer = discoverer;

            await messageBus.send('FIRST_DISCOVERER_SET', { targetId, discoverer }, 'SedimentationModule');
            logger.info(`First discoverer set for ${targetId}: ${discoverer}`, undefined, 'SedimentationModule');
        }
    }

    /**
     * Increment usage count
     */
    incrementUsage(targetId: UUID): void {
        const meta = this.metaData.get(targetId);
        if (meta) {
            meta.usageCount++;
        }
    }

    /**
     * Get reports for a target
     */
    getReportsForTarget(targetId: UUID): ErrorReport[] {
        return Array.from(this.reports.values()).filter(
            r => r.targetId === targetId
        );
    }

    /**
     * Get all pending reports
     */
    getPendingReports(): ErrorReport[] {
        return Array.from(this.reports.values()).filter(
            r => r.status === 'PENDING'
        );
    }

    /**
     * Update report status
     */
    async updateReportStatus(reportId: UUID, status: ErrorReport['status']): Promise<boolean> {
        const report = this.reports.get(reportId);
        if (!report) return false;

        report.status = status;

        await messageBus.send('REPORT_STATUS_UPDATED', report, 'SedimentationModule');
        logger.debug(`Report status updated: ${reportId} -> ${status}`, undefined, 'SedimentationModule');

        return true;
    }

    /**
     * Check if user has voted on target
     */
    hasUserVoted(userId: UUID, targetId: UUID): boolean {
        const userVotes = this.userFeedback.get(userId);
        return userVotes ? userVotes.has(targetId) : false;
    }

    /**
     * Get top-rated content
     */
    getTopRated(count: number = 10): MetaData[] {
        return Array.from(this.metaData.values())
            .sort((a, b) => b.stability - a.stability)
            .slice(0, count);
    }

    /**
     * Load meta data
     */
    loadMetaData(data: MetaData[]): void {
        for (const meta of data) {
            this.metaData.set(meta.targetId, meta);
        }
        logger.info(`Loaded ${data.length} meta data records`, undefined, 'SedimentationModule');
    }

    /**
     * Load feedback
     */
    loadFeedback(feedbackList: Feedback[]): void {
        for (const feedback of feedbackList) {
            this.feedback.set(feedback.id, feedback);
        }
        logger.info(`Loaded ${feedbackList.length} feedback records`, undefined, 'SedimentationModule');
    }

    /**
     * Clear all data
     */
    clear(): void {
        this.feedback.clear();
        this.metaData.clear();
        this.reports.clear();
        this.userFeedback.clear();
        logger.info('Sedimentation data cleared', undefined, 'SedimentationModule');
    }
}

// Export singleton instance
export const sedimentationModule = SedimentationModule.getInstance();
export default sedimentationModule;
