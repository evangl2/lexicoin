# IndexedDB Schema 维护与 Debug 指南

> 数据库：`lexicoin_db`（Dexie v4 + IndexedDB）
> 定义文件：`src/core/storage/db.ts`

---

## 当前 Schema（v7）

| 表 | Primary Key | Secondary Index | 用途 |
|----|-------------|-----------------|------|
| `gameData` | `key` | — | Zustand 状态持久化 |
| `canvasPositions` | `uid` | `location` | 卡牌坐标与位置 |
| `senses` | `uid` | — | SenseEntity 数据 |
| `visuals` | `[uid+variantId]` | `uid` | VisualEntry 图像数据 |
| `devices` | `uid` | `location` | 合成圈等设备 |
| `cardInventory` | `uid` | `language` | 卡牌耐久度 |
| `synthesisLog` | `id` | `resultUid, language, timestamp` | 合成历史 |

> `visuals` 使用复合主键 `[uid+variantId]`，TypeScript 声明为 `EntityTable<VisualRecord, 'uid'>` 存在类型不匹配，但不影响运行时（TypeScript 类型在运行时被抹除）。

---

## Schema 变更风险等级

修改 schema 前，先判断变更类型：

### 🟢 低风险：新增表 / 新增 index

Dexie 完全支持，直接在新 version 中添加。

```typescript
db.version(8).stores({
    ...所有现有表定义（原样复制）...
    newTable: 'uid, someIndex',  // 新增
});
```

> **注意**：每次新 version 都必须把所有表的定义完整写出，不能只写变更部分。

---

### 🟡 中风险：删除 index / 修改 index

Dexie 支持，但需要验证使用该 index 的查询代码同步更新。

```typescript
db.version(8).stores({
    ...
    senses: 'uid, newIndex',  // 改了 index
}).upgrade(async trans => {
    // 如果有需要迁移的数据逻辑，在这里处理
});
```

---

### 🔴 高风险：修改 Primary Key

**IndexedDB 规范明确禁止在 versionchange 事务中修改已有 object store 的 keyPath。**
Dexie 不会自动处理，尝试直接修改会导致整个数据库打开失败（`OpenFailedError`），所有表不可访问。

**唯一合法路径：新建表 → 迁移数据 → 删除旧表**（用两个连续 version 实现）

```typescript
// 错误做法——直接修改 PK，DB 会打开失败
db.version(8).stores({
    visuals: 'uid',  // 从 [uid+variantId] 改为 uid，会崩溃
});

// 正确做法
// Step 1: 在新 version 中新增目标表（旧表保留）
db.version(8).stores({
    ...现有表...
    visuals_v2: 'uid, variantId',  // 新表，新 PK
}).upgrade(async trans => {
    const oldRecords = await trans.table('visuals').toArray();
    // 处理 PK 冲突（同 uid 的多条记录，决定保留哪条）
    const newRecords = deduplicateByUid(oldRecords);
    await trans.table('visuals_v2').bulkPut(newRecords);
});

// Step 2: 在下一个 version 中删除旧表，重命名（或直接用新表名）
db.version(9).stores({
    ...现有表（去掉 visuals）...
    visuals_v2: 'uid, variantId',
});
```

> 如果旧数据不需要保留，可以在 upgrade 回调中跳过迁移，让 seed 重填。

---

## 版本变更规则

1. **版本号只增不减**。一旦用户浏览器有了 v6，代码里就必须保留 v1-v6 的定义，不能删除历史版本。

2. **每个 version 必须包含所有表的完整定义**。Dexie 用最新 version 的 stores 描述作为目标 schema，缺少的表会被认为需要删除。

3. **upgrade 回调在 versionchange 事务中执行**。事务外的 async 操作（setTimeout、fetch 等）会导致事务自动提交后继续执行，引发不可预测的错误。所有操作必须通过 `trans.table(...)` 进行。

4. **在有存量数据的浏览器上测试迁移**。新建数据库不会触发 upgrade 路径，只有从旧版本升级才会。迁移逻辑的唯一有效测试场景是"已存在旧版本数据的升级"。

---

## 常见 Bug 模式

### Bug 1：DB 完全打开失败（所有表都报错）

**症状：**
```
[Persistence] Failed to load state from IndexedDB DexieError
[ModuleInit] Failed to initialize modules DexieError
[App] ❌ Failed to initialize app DexieError
```
所有模块同时失败，包括与 `visuals` 无关的表。

**根因：** 最新 version 的 upgrade 事务失败，导致 Dexie 无法完成数据库版本升级，整个 DB 实例进入失败状态。

**排查步骤：**
1. 打开 DevTools → Application → IndexedDB → `lexicoin_db`，查看当前版本号
2. 检查 `db.ts` 中最新 version 的 `.stores()` 和 `.upgrade()` 是否有：
   - Primary key 变更（高风险操作）
   - upgrade 回调中的事务外 async 操作
3. 临时修复：在 DevTools → Application → Storage → Clear site data，强制清空后重新加载（会丢失用户数据）

---

### Bug 2：`put` 时 DataError（key path 无效）

**症状：**
```
Failed to execute 'put' on 'IDBObjectStore':
Evaluating the object store's key path yielded a value that is not a valid key
```

**根因：** 存入的对象缺少 primary key 对应的字段，或字段值为 `undefined` / `null`。

**排查：**
- 检查 `.put()` / `.bulkPut()` 传入对象是否包含所有 primary key 字段
- 复合主键 `[uid+variantId]`：对象必须同时有 `uid` 和 `variantId` 且都是有效值
- 在调用前加 `console.log` 检查实际传入的对象

**注意：** 这个错误本身不会崩溃 App（已被 try/catch 包裹），但如果错误传播到 MessageBus 且没有被隔离，可能触发队列死锁（见 MessageBus 维护文档）。

---

### Bug 3：seed 不生效（表有数据但都是旧数据）

**症状：** 添加了新的初始 sense 或 visual，刷新后没有出现。

**根因：** `seed()` 的逻辑是"表不为空则跳过"：
```typescript
const existingCount = await db.senses.count();
if (existingCount > 0) return;  // 已有数据，不 seed
```

**解决：**
- 开发时：用 DevConsole 的 "Restore Initial State" 重置
- 或在 DevTools → Application → IndexedDB 手动清空对应表

---

## 新增/修改表 Checklist

- [ ] 确认变更类型（新增表 / 改 index / 改 PK），评估风险等级
- [ ] 新建 `db.version(N+1).stores({...})` —— **N+1 必须包含所有表的完整定义**
- [ ] 如果有数据迁移需求，在 `.upgrade()` 回调中处理，所有操作通过 `trans.table()` 进行
- [ ] 更新对应的 Repository（`src/core/storage/`）中的增删改查方法
- [ ] 更新 `db.ts` 顶部的 TypeScript 接口定义（`interface XxxRecord`）
- [ ] 更新 `DevConsole.tsx` 的 "Restore Initial State" 功能，确保新表包含在重置逻辑中
- [ ] 在 DevTools 手动升级一次（从旧版本），验证 upgrade 路径正常
- [ ] 更新本文档的 Schema 版本表

---

## 紧急恢复

如果 DB 损坏导致 App 无法启动：

```javascript
// DevTools Console 中执行
indexedDB.deleteDatabase('lexicoin_db');
// 然后刷新页面——App 会以全新状态启动
```

> 这会丢失所有本地数据。仅在无法通过 upgrade 修复时使用。
