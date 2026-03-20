/**
 * Project: Lexicoin - User Learning Progress Schema
 * 
 * Purpose:
 * Defines the local-only data structure for tracking individual user
 * learning progress per SenseEntity. Powers the Review Module (圣所仪式)
 * and spaced repetition scheduling.
 * 
 * Storage:
 * - Primary: IndexedDB (client-side, offline-capable)
 * - Future: Optional Supabase cloud sync (Phase 2+)
 * 
 * IndexedDB Configuration:
 * - Store name: 'user_sense_progress'
 * - KeyPath: 'senseUid'
 * - Indexes: nextReviewAt, status, masteryScore
 * 
 * This is SEPARATE from the global SenseEntity schema.
 * SenseEntity is shared knowledge; UserSenseProgress is personal state.
 */

// ============================================================================
// MASTERY STATUS
// ============================================================================

/**
 * Learning status progression.
 * 
 * Lifecycle:
 * unseen → discovered → learning → familiar → mastered
 * 
 * - unseen:     Concept exists in system but user has never encountered it.
 * - discovered: User has seen the concept (e.g., via synthesis result) but not reviewed.
 * - learning:   User has begun active review; SRS scheduling is active.
 * - familiar:   User demonstrates consistent recall; interval is growing.
 * - mastered:   User achieves high mastery score with long intervals.
 */
export type MasteryStatus = 'unseen' | 'discovered' | 'learning' | 'familiar' | 'mastered';

// ============================================================================
// USER SENSE PROGRESS
// ============================================================================

/**
 * UserSenseProgress: Personal learning state for a specific concept.
 * 
 * Each record tracks one user's relationship with one SenseEntity.
 * All timestamps are Unix milliseconds.
 * 
 * SRS (Spaced Repetition System) fields:
 * - nextReviewAt: When to schedule the next review
 * - intervalMultiplier: Growth factor for review intervals
 *   - Increases on correct answers (typically × 2.5)
 *   - Resets to base on errors
 *   - Based on SM-2 algorithm variant
 */
export interface UserSenseProgress {
    /** FK to SenseEntity.uid — primary key in IndexedDB */
    senseUid: string;

    /** Current mastery status in the learning lifecycle */
    status: MasteryStatus;

    /** Total number of times user has encountered this concept */
    encounterCount: number;

    /** Number of consecutive correct answers in review sessions */
    correctStreak: number;

    /** Total errors across all review sessions */
    totalErrors: number;

    /** 
     * Mastery score: 0–100.
     * Computed from review performance (accuracy × consistency × recency).
     * Used for sorting and filtering in the library module.
     */
    masteryScore: number;

    /** Unix ms: when user first encountered this concept */
    firstSeenAt: number;

    /** Unix ms: last completed review session */
    lastReviewedAt: number;

    /** 
     * Unix ms: next scheduled review.
     * Used by SRS query: SELECT WHERE nextReviewAt <= NOW() ORDER BY nextReviewAt.
     */
    nextReviewAt: number;

    /** 
     * SRS interval growth factor.
     * - Initial value: 1.0
     * - Grows on correct answers (e.g., × 2.5)
     * - Resets toward 1.0 on errors
     */
    intervalMultiplier: number;
}

export default UserSenseProgress;
