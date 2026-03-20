# Lexicoin Storage System

**Current Version**: 2.0 (IndexedDB via Dexie.js)
**Last Updated**: 2026-02-11

## 1. Overview

The storage system provides offline-first data persistence using **IndexedDB** through the [Dexie.js](https://dexie.org/) library. It replaces the original localStorage-based approach to overcome the 5-10MB browser storage limit.

### Why IndexedDB?
| Concern | localStorage (old) | IndexedDB (current) |
|---------|-------------------|---------------------|
| Capacity | 5-10 MB | Hundreds of MB to GB |
| API | Synchronous (blocks main thread) | Asynchronous (non-blocking) |
| Transactions | ❌ | ✅ ACID-compliant |
| Data Types | Strings only (JSON.stringify everything) | Structured objects, Blobs, ArrayBuffers |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│                  Consumers                       │
│                                                  │
│  moduleInit.ts          useCardManager.ts        │
│  (game data)            (canvas positions)       │
│       │                        │                 │
│       ▼                        │                 │
│  StorageManager ────┐          │                 │
│  (singleton)        │          │                 │
│                     ▼          ▼                 │
│              ┌─────────────────────┐             │
│              │     db.ts           │             │
│              │  Dexie Singleton    │             │
│              │                     │             │
│              │  ┌───────────────┐  │             │
│              │  │  gameData     │  │             │
│              │  │  key: string  │  │             │
│              │  └───────────────┘  │             │
│              │  ┌───────────────┐  │             │
│              │  │canvasPositions│  │             │
│              │  │  uid: string  │  │             │
│              │  └───────────────┘  │             │
│              └─────────────────────┘             │
│                    IndexedDB                     │
└──────────────────────────────────────────────────┘
```

### Key Files

| File | Role |
|------|------|
| `src/core/storage/db.ts` | Dexie database singleton, table schema definitions, type exports |
| `src/core/storage/StorageManager.ts` | High-level API for game data (player state, senses). Handles versioned data migrations, atomic save with backup, auto-save via MessageBus |
| `src/app/hooks/useCardManager.ts` | React hook that persists canvas card positions. Reads from `canvasPositions` table directly via Dexie |

---

## 3. Database Schema

Database name: `lexicoin_db`

### Table: `gameData`

| Field | Type | Description |
|-------|------|-------------|
| `key` (PK) | `string` | `'main'` = active data, `'backup'` = last-known-good, `'_migration_done'` = migration flag |
| `player` | `PlayerState?` | Player vitals, progression, settings, stats |
| `senses` | `Sense[]?` | Collection of learned sense entities |
| `lastSyncAt` | `number?` | Timestamp of last save |
| `version` | `string` | Data schema version (currently `'0.2.0'`) |

### Table: `canvasPositions`

| Field | Type | Description |
|-------|------|-------------|
| `uid` (PK) | `string` | Sense entity UID |
| `x` | `number` | X coordinate on canvas |
| `y` | `number` | Y coordinate on canvas |

---

## 4. Initialization Flow

The storage system initializes during the application boot sequence in `App.tsx`:

1. `App.tsx` calls `await initializeModules()`
2. `moduleInit.ts` calls `await storageManager.initialize()`:
   - Opens the Dexie database connection
   - Runs one-time localStorage → IndexedDB migration (if needed)
   - Enables auto-save MessageBus subscriptions
3. `moduleInit.ts` calls `await storageManager.load()` to restore game state
4. `App.tsx` sets `isReady = true` → `CanvasApp` mounts
5. `useCardManager` reads canvas positions from IndexedDB

> **Important**: The `isReady` gate in `App.tsx` guarantees that `useCardManager` only mounts **after** the database is fully initialized and any migration is complete. There is no race condition.

---

## 5. Data Safety Mechanisms

### 5.1 Atomic Save with Backup
Every `save()` call runs inside a single Dexie transaction:
1. Copy current `main` record → `backup`
2. Write new data to `main`

If the transaction fails, neither step persists. If `load()` fails on `main`, it falls back to `backup`.

### 5.2 Canvas Position Debounce
`useCardManager.saveItems()` uses a 300ms debounce. Rapid card dragging produces a single batch write instead of many individual writes. The save uses an atomic `clear() + bulkPut()` within one transaction.

### 5.3 Data Version Migrations
`StorageManager` maintains a migration chain (`0.1.0` → `0.2.0` → ...). When loading data, it detects the stored version and applies sequential migrations as needed.

---

## 6. localStorage Migration

A one-time migration runs on first launch after the upgrade:

1. Check for `_migration_done` flag in IndexedDB → if present, skip
2. Read `lexicoin_data` and `canvas-items` from localStorage
3. Write both into IndexedDB tables within **a single transaction** (including the migration flag)
4. On success: immediately clear all localStorage keys
5. On failure: localStorage is preserved; migration retries on next launch

### Migrated Keys

| localStorage Key | → IndexedDB Table | Notes |
|------------------|--------------------|-------|
| `lexicoin_data` | `gameData` (key=`'main'`) | Player + senses |
| `lexicoin_data_temp` | *(removed)* | No longer needed — Dexie transactions are atomic |
| `lexicoin_data_backup` | *(removed)* | Replaced by in-table backup |
| `canvas-items` | `canvasPositions` | One record per card |

---

## 7. API Reference

### StorageManager (singleton)

```typescript
import { storageManager } from '@core/storage/StorageManager';

// Must call once at startup
await storageManager.initialize();

// Core operations
await storageManager.save({ player, senses });
const data = await storageManager.load();
await storageManager.clear();

// Convenience methods
await storageManager.savePlayer(player);
const player = await storageManager.loadPlayer();
await storageManager.saveSenses(senses);
const senses = await storageManager.loadSenses();

// Configuration
storageManager.setAutoSave(true|false);
```

### Direct Dexie Access (for canvas positions)

```typescript
import { db } from '@core/storage/db';

// Read all positions
const positions = await db.canvasPositions.toArray();

// Write positions (atomic)
await db.transaction('rw', db.canvasPositions, async () => {
    await db.canvasPositions.clear();
    await db.canvasPositions.bulkPut(records);
});
```

---

## 8. Debugging

Open browser DevTools → **Application** tab → **IndexedDB** → `lexicoin_db` to inspect:
- `gameData` table: should contain `main` (and optionally `backup`, `_migration_done`)
- `canvasPositions` table: one row per card with `uid`, `x`, `y`

To verify migration completed: check that `_migration_done` exists in `gameData` and localStorage is empty.
