# 持久化系统 (Persistence System)

本文档详细说明了 Lexicoin 项目中的数据持久化架构。该系统旨在实现“即时存档”，确保玩家的核心数据、配置和关键选择在刷新或关闭浏览器后依然保留，同时有意丢弃临时的 UI 状态。

## 1. 架构概览

持久化系统采用了 **Zustand Middleware** + **IndexedDB** 的分层架构。

*   **Zustand (State Layer)**: 负责应用的实时状态管理，作为“内存数据库”。
*   **persist Middleware**: Zustand 的官方中间件，负责监听状态变化并写入存储适配器。
*   **Dexie.js (Storage Engine)**: 封装 IndexedDB 的底层操作，提供异步、事务性的数据存储。
*   **Local Adapter**: 自定义的 `indexedDBStorage` 适配器，连接 Zustand 和 Dexie。

### 数据流向

1.  **Write (Save)**: Zustand State Change -> persist middleware -> `partialize` (过滤) -> `indexedDBStorage.setItem` -> Dexie (`gameData` table)
2.  **Read (Hydrate)**: App Init -> `useGameStore` creation -> `indexedDBStorage.getItem` -> Dexie -> Zustand State

## 2. 存储策略

我们采用 **白名单 (Allowlist)** 策略，只持久化明确需要保存的数据，其余数据视为“临时状态” (Transient State)。

### ✅ 持久化的数据 (Persisted)

这些数据保存在 IndexedDB 的 `gameData` 表中，键为 `'app-state'`。

| 类别 | 字段 | 说明 |
| :--- | :--- | :--- |
| **核心数据** | `player` | 等级、XP、属性、最后登录时间 |
| | `senses` | 玩家收集的所有 Sense (卡片数据源) |
| | `inventory` | 物品栏中的物品 |
| | `constructions` | (预留) 玩家构建的语法结构 |
| **配置** | `learningLang` | 学习语言 (如: English) |
| | `systemLang` | 系统语言 (如: 简体中文) |
| | `activeSkin` | 当前生效的 UI/卡片皮肤 |
| | `audio` | 音量大小和静音状态 |
| **卡片状态** | `activeVariants` | 记录每张卡片当前选择的“义项/变体” (Merge Choice) |
| **视图** | `viewMode` | 当前视图模式 (World/Reading) |
| | `canvasView` | 画布的位置 (x, y) 和缩放 (scale) |
| **其他** | `activePersona` | 当前激活的人格 (Logician 等) |
| | `personaResonance`| 各人格的共鸣度/好感度 |
| | `libraryFilter` | 资料库的筛选条件 |

### ❌ 不持久化的数据 (Transient)

这些数据在页面刷新后会重置为默认值。

| 类别 | 字段 | 原因 |
| :--- | :--- | :--- |
| **UI 开关** | `deckState.isOpen` | 侧边栏/抽屉。重新进入游戏应保持界面整洁。 |
| | `isConfigOpen` | 设置菜单。不应在刷新后突然遮挡屏幕。 |
| **临时状态**| `isFlipped` | 卡片翻面。属于短期交互状态。 |
| | `isExpanded` | 卡片展开详情。属于短期交互状态。 |
| | `dragState` | 拖拽过程中的坐标。毫无保存价值。 |
| | `notifications` | 临时的系统通知/Toast。 |
| | `modulesReady` | 系统初始化状态标志。 |

## 3. 代码实现

### Store 配置 (`src/store/index.ts`)

```typescript
export const useGameStore = create<GameStore>()(
    persist(
        (set, get, api) => ({
            // ... State Definitions ...
        }),
        {
            name: 'app-state', // IndexedDB Key
            storage: indexedDBStorage, // Custom Adapter
            partialize: (state) => ({
                // 仅返回需要持久化的字段
                player: state.player,
                config: state.config,
                // ...
            }),
        }
    )
);
```

### 存储适配器 (`src/store/persistence.ts`)

我们实现了 Zustand 的 `PersistStorage` 接口：

```typescript
export const indexedDBStorage: PersistStorage<any> = {
    getItem: async (name) => {
        // 从 Dexie 读取
        const record = await db.gameData.get(name);
        return record?.state || null;
    },
    setItem: async (name, value) => {
        // 写入 Dexie
        await db.gameData.put({ key: name, state: value, ... });
    },
    removeItem: async (name) => {
        await db.gameData.delete(name);
    },
};
```

### 数据库 Schema (`src/core/storage/db.ts`)

使用 `Dexie` 定义数据库结构：

```typescript
class LexicoinDatabase extends Dexie {
    gameData!: Table<GameDataRecord, string>; 
    // ...
    constructor() {
        super('LexicoinDB');
        this.version(3).stores({
            gameData: 'key', // key = 'app-state'
            // ...
        });
    }
}
```

## 4. 扩展指南

### 如何添加新的持久化数据？

1.  **Define**: 在 `src/types` 中定义数据类型。
2.  **Slice**: 在 `src/store/slices` 或 `src/store/index.ts` 中添加状态和 Action。
3.  **Allowlist**: 修改 `src/store/index.ts` 中的 `partialize` 函数，将新字段名加入返回对象。

### 如何迁移旧数据？

目前系统设计为由于是单机 IndexedDB，若数据结构发生重大变化（Breaking Changes）：
1.  可以在 `src/store/persistence.ts` 的 `getItem` 中添加迁移逻辑。
2.  或者利用 Dexie 的 `version()` 升级机制进行数据库层面的迁移。

## 5. 调试

*   **查看数据**: 浏览器开发者工具 -> Application -> IndexedDB -> `LexicoinDB` -> `gameData` -> Key `app-state`。
*   **重置数据**: 删除该记录或点击 Application 栏的 "Delete Database"。

---
*文档最后更新时间: 2026-02-12*
