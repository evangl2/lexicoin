# 游戏基础设施 — WBS 工作分解结构 v1.1

> **团队**：1 人类 + 1 AI · **顺序**：配置 → 类型 → 数据层 → 业务系统 → 集成 → 导出导入
> **参考文档**：`context/infrastructure_tdd.md` · `context/infrastructure_prd.md`
>
> **v1.1 变更**：废除全局等级相关任务；简化 LevelDistributionSampler（移除 cefrUnlocked）；useSynthesis 集成逻辑更新（SenseCollection 本地判断 + 失败不扣耐久 + 三分支处理）；cardInventory 新增 exists / delete 方法。

---

## Phase 0：基础配置与类型（无前置，可立即开始）

### 0.1 · 【AI 任务】新建 BalanceConfig

**前置**：无
**文件**：`src/config/balance.ts`

创建以下内容：
- `CEFR_LEVELS` 常量和 `CEFRLevel` 类型（供全项目 import）
- `MAX_LANGUAGE_LEVEL = 100`
- `LEVEL_XP_THRESHOLDS`：100 条，暂用占位值（如等差数列）
- `LEVEL_CEFR_DISTRIBUTION`：100 行概率矩阵，暂填少量示例行（1、10、50、100 级），其余 fallback 到相邻行
- `CEFR_XP_COEFFICIENT`：6 个等级的系数
- `DURABILITY_INITIAL / SYNTHESIS_COST / DUPLICATE_RESTORE`：暂用占位值
- `XP_SENSE_BASE`：暂用占位值

**产出**：`import { CEFRLevel, CEFR_LEVELS } from '@/config/balance'` 编译通过
**验证**：TypeScript 无报错，所有导出名称可被外部 import

---

### 0.2 · 【AI 任务】更新 PlayerState 类型

**前置**：0.1（需要 `CEFRLevel` 类型）
**文件**：`src/types/index.ts`、`src/core/store/index.ts`

**修改 `src/types/index.ts`**：
- **删除** `PlayerState` 中的 `level: number`、`xp: number`、`xpToNextLevel: number`
- **新增** `LanguageProgress` 接口（level, xp, xpToNextLevel, sensesCollected, startedAt）
- **新增** `StreakData` 接口（current, best, lastPlayDate）
- **在 `PlayerState` 中追加**：
  - `languageProgress: Partial<Record<Language, LanguageProgress>>`
  - `streak: StreakData`

**修改 `src/core/store/index.ts`**：
- 从 `initialPlayer` 中删除 `level / xp / xpToNextLevel`
- 追加 `languageProgress: {}` 和 `streak: { current: 0, best: 0, lastPlayDate: '' }`

**产出**：PlayerState 类型更新完成，initialPlayer 通过 TypeScript 检查
**验证**：`player.languageProgress['en']?.level` 类型推断为 `number | undefined`；`player.level` 编译报错（确认已删除）

---

### 0.3 · 【AI 任务】扩展 protocol.ts 事件类型

**前置**：0.1
**文件**：`src/types/protocol.ts`

新增（加入 `AppMessage` union）：
- `XPEarnedMessage`（含 language 字段）
- `LevelUpMessage`（含 language 字段，无 newCefrLevel）
- `CardDurabilityChangedMessage`
- `CardDepletedMessage`

预留声明（不加入 union，注释 `// RESERVED`）：
- `AchievementUnlockedMessage`
- `StreakUpdatedMessage`
- `GrimoireGeneratedMessage`
- `GrimoireSlotFilledMessage`
- `GrimoireCompletedMessage`

**产出**：protocol.ts 无类型报错
**验证**：`messageBus.send('XP_EARNED', { source: 'SENSE_COLLECTED', amount: 10, totalXp: 10, language: 'en' })` 类型正确

---

## Phase 1：数据层

### 1.1 · 【AI 任务】Dexie DB 升级至 v6

**前置**：0.1（需要 Language 类型）
**文件**：`src/core/storage/db.ts`

新增：
- `CardInventoryRecord` 接口（uid, durability, acquiredAt, language）
- `SynthesisLogRecord` 接口（id, input1Uid, input2Uid, resultUid, language, cefrLevel, isNewDiscovery, timestamp）
  - 注意：**无 `isGlobalFirst` 字段**
- 将两张表加入 `db` 常量的类型声明
- `db.version(6).stores(...)` 包含 `cardInventory: 'uid, language'` 和 `synthesisLog: 'id, resultUid, language, timestamp'`

**产出**：db.ts 编译通过
**验证**：浏览器 DevTools → IndexedDB → `lexicoin_db` 可见 `cardInventory` 和 `synthesisLog` 两张表，已有数据不丢失

---

### 1.2 · 【AI 任务】新建 CardInventoryRepository

**前置**：1.1
**文件**：`src/core/storage/CardInventoryRepository.ts`

```typescript
class CardInventoryRepository {
    exists(uid: string): Promise<boolean>
    get(uid: string): Promise<CardInventoryRecord | undefined>
    getAll(): Promise<CardInventoryRecord[]>
    upsert(record: CardInventoryRecord): Promise<void>
    updateDurability(uid: string, newDurability: number): Promise<void>
    delete(uid: string): Promise<void>              // 移除卡牌时调用
    countByLanguage(language: Language): Promise<number>
}
export const cardInventoryRepository = new CardInventoryRepository();
```

**产出**：所有方法可正常读写 IndexedDB
**验证**：
- `upsert` 后 `exists(uid)` 返回 `true`
- `delete` 后 `exists(uid)` 返回 `false`
- `get` 不存在的 uid 返回 `undefined`（不抛错）

---

### 1.3 · 【AI 任务】新建 SynthesisLogRepository

**前置**：1.1
**文件**：`src/core/storage/SynthesisLogRepository.ts`

```typescript
class SynthesisLogRepository {
    write(log: Omit<SynthesisLogRecord, 'id'>): Promise<void>   // 自动生成 UUID id
    getByResult(resultUid: string): Promise<SynthesisLogRecord[]>
    getByLanguage(language: Language): Promise<SynthesisLogRecord[]>
    getRecipe(input1Uid: string, input2Uid: string): Promise<SynthesisLogRecord | undefined>
    getAll(): Promise<SynthesisLogRecord[]>
    count(): Promise<number>
}
export const synthesisLogRepository = new SynthesisLogRepository();
```

`getRecipe()` 必须同时匹配 (input1, input2) 和 (input2, input1) 两种顺序。

**产出**：可正常读写
**验证**：
- `write()` 后 `count()` 加 1
- `getRecipe(uid1, uid2)` 与 `getRecipe(uid2, uid1)` 返回相同记录

---

## Phase 2：业务系统

### 2.1 · 【AI 任务】新建 LevelDistributionSampler

**前置**：0.1
**文件**：`src/core/services/LevelDistributionSampler.ts`

实现：
```typescript
export function sampleMaxLevel(languageLevel: number): CEFRLevel
```

逻辑：
1. `LEVEL_CEFR_DISTRIBUTION[languageLevel]` 取分布（缺失则 `{ A1: 1.0 }`）
2. 加权随机抽样
3. 安全保底返回 `'A1'`

同时导出 `getDistributionForLevel(level: number): CEFRDistribution`（纯函数，便于测试）。

**产出**：函数可被 useSynthesis 调用
**验证**：
- `sampleMaxLevel(1)` 100次均返回 `'A1'`（level 1 分布为 `{ A1: 1.0 }`）
- `sampleMaxLevel(50)` 1000次采样中 A1 频率符合配置概率（±5%）
- 传入 `languageLevel = 0` 不抛错（fallback 到 A1）

---

### 2.2 · 【AI 任务】新建 XPRegistry

**前置**：0.1, 0.3
**文件**：`src/core/services/XPRegistry.ts`

实现 XPRegistry 类（见 TDD §3.2），`award()` 流程：
1. `computeAmount(context)` 计算 XP
2. 读取 `languageProgress[language]`，如不存在则先 `initLanguage`
3. `updatePlayer` → `languageProgress[language].xp += amount`
4. `messageBus.send('XP_EARNED', { source, amount, totalXp, language })`
5. 调用 `playerLevelSystem.checkLevelUp(language)`

初始化时注册 `SENSE_COLLECTED` 来源。

**产出**：`xpRegistry.award('SENSE_COLLECTED', { cefrLevel: 'B1', language: 'en' })` 可更新 store
**验证**：award 前后 `languageProgress['en'].xp` 差值 = `XP_SENSE_BASE × CEFR_XP_COEFFICIENT['B1']`

---

### 2.3 · 【AI 任务】新建 PlayerLevelSystem

**前置**：0.1, 0.2, 2.2
**文件**：`src/core/services/PlayerLevelSystem.ts`

实现：
- `checkLevelUp(language: Language): void`
  - 读取 `languageProgress[language].xp` 和 `level`
  - 对比 `LEVEL_XP_THRESHOLDS[level - 1]`
  - 满足 → `level += 1`，`xp -= threshold`，更新 `xpToNextLevel`
  - `messageBus.send('LEVEL_UP', { language, newLevel, previousLevel })`
  - 如新 xp 仍满足下一级，继续循环（一次可升多级）
- `initLanguage(language: Language): void`
  - 如 `languageProgress[language]` 不存在，创建初始条目（level:1, xp:0, ...）

**产出**：升级逻辑正确
**验证**：
- xp 刚好达到阈值 → `checkLevelUp` 后 level +1，剩余 xp 正确
- 一次性 xp 足够升 3 级 → level +3，xp 正确保留余量
- 100 级后 xp 增加，level 不变

---

### 2.4 · 【AI 任务】新建 DurabilitySystem

**前置**：1.2, 0.3
**文件**：`src/core/services/DurabilitySystem.ts`

实现（见 TDD §3.4），关键点：
- `deductOnSynthesis`：**仅在合成成功时被调用**，内部不做成功/失败判断
- 两张卡分别处理：各自独立检查耐久归零
- 耐久归零 → `cardInventoryRepository.delete(uid)` → publish `CARD_DEPLETED`
- `removeCard`：主动删除卡牌，同样 delete + publish

**产出**：耐久变更正确写入 IndexedDB 并广播事件
**验证**：
- 初始耐久 100 → deduct 后 = `100 - DURABILITY_SYNTHESIS_COST`
- 耐久 5 的卡片 deduct 后：cardInventory 记录被删除，`CARD_DEPLETED` 事件被触发
- `restoreOnDuplicate` 不超过 100 上限
- `removeCard` 后 `cardInventoryRepository.exists(uid)` = `false`

---

## Phase 3：Zustand Store 集成

### 3.1 · 【AI 任务】新建 PlayerLevelSlice

**前置**：0.2, 2.3
**文件**：`src/core/store/slices/createPlayerLevelSlice.ts`

```typescript
interface PlayerLevelSlice {
    getLanguageProgress(lang: Language): LanguageProgress | undefined;
    initLanguage(lang: Language): void;
    incrementXP(lang: Language, amount: number): void;
    incrementLevel(lang: Language): void;
    incrementSensesCollected(lang: Language): void;
}
```

将 `PlayerLevelSlice` 合并到 `GameStore`（修改 `src/core/store/interfaces.ts`）。

**产出**：slice 挂载到 store
**验证**：
- `initLanguage('en')` 后 `getLanguageProgress('en')` = `{ level: 1, xp: 0, ... }`
- 切换语言后两套进度互不影响

---

## Phase 4：合成流程集成

### 4.1 · 【AI 任务】改造 useSynthesis

**前置**：2.1, 2.2, 2.3, 2.4, 1.2, 1.3, 3.1
**文件**：`src/app/hooks/useSynthesis.ts`（确认实际路径）

按 TDD §5 实现完整插入逻辑。关键检查点：

**三分支处理**（合成成功后）：
```
isNewDiscovery = !(await senseRepository.exists(resultUid))
isCurrentlyHeld = await cardInventoryRepository.exists(resultUid)

if isNewDiscovery:
    → 写 SenseCollection + 创建 cardInventory(100) + 发 XP + 检测升级
elif isCurrentlyHeld:
    → 恢复耐久（重复持有）
else:
    → 创建 cardInventory(100)，不发 XP（曾有已失去）
```

**合成失败分支**：
```
if !result.success:
    → return（不执行任何耐久、日志、XP 操作）
```

**产出**：完整合成链路正常，新系统正确接入
**验证**：
- 合成新词 → xp 增加，synthesisLog 有记录，两张输入卡耐久下降
- 合成重复词（画布上有）→ 结果卡耐久恢复，xp 不变
- 合成曾有词（已丢失）→ 新建 cardInventory(100)，xp 不变
- **合成失败 → 耐久不变，synthesisLog 无新记录，xp 不变**

---

### 4.2 · 【人类】联调验证

**前置**：4.1

在浏览器中验证：

- [ ] 合成成功 → 控制台有 `XP_EARNED` 事件
- [ ] 合成成功 → 控制台有 `CARD_DURABILITY_CHANGED` 事件
- [ ] 累计 XP 达到升级阈值 → `LEVEL_UP` 事件（payload 含 language）
- [ ] 某卡耐久归零 → `CARD_DEPLETED` 事件，卡从 Canvas 消失
- [ ] **合成失败 → 无任何事件，耐久不变**
- [ ] 重复合成画布上已有的词 → 结果卡耐久恢复
- [ ] 合成曾拥有但已丢失的词 → 新建卡耐久 100，无 XP
- [ ] IndexedDB `synthesisLog` 表：合成成功有记录，失败无记录
- [ ] IndexedDB `cardInventory` 表：耐久值正确变化
- [ ] 切换 learningLang 后，等级显示切换到对应语言的 level

---

## Phase 5：导出/导入

### 5.1 · 【AI 任务】新建 ExportImportService

**前置**：1.1, 1.2, 1.3, 3.1
**文件**：`src/core/services/ExportImportService.ts`

见 TDD §3.5。关键点：
- `exportToFile()`：读取所有 Dexie 表 + Zustand PlayerState（含 languageProgress），包含 `schemaVersion: 1`
- `importFromFile(file)`：校验版本 → 清空所有表 → 全量写入 → 更新 store
- 文件名：`lexicoin-backup-{YYYY-MM-DD}.json`

**产出**：导出/导入完整可用
**验证**：
- 导出文件包含所有 7 类数据
- 清空 IndexedDB 后导入，各语言等级/XP/耐久度/Canvas 位置全部恢复
- 导入格式错误的文件时给出具体错误，不崩溃
- `schemaVersion: 1` 字段存在

---

### 5.2 · 【AI 任务】UI 入口（最小化）

**前置**：5.1
**位置**：ConfigMenu 或设置页面

添加：
- 「导出数据」按钮 → `exportImportService.exportToFile()`
- 「导入数据」按钮 → `<input type="file" accept=".json">` → 确认弹窗 → `importFromFile(file)`
- 确认弹窗文本：「导入将覆盖当前设备数据，此操作不可撤销。确认继续？」

**产出**：两个操作均可在 UI 中完成

---

## 任务依赖图

```
0.1 ──┬──→ 0.2 ──→ 2.3 ──→ 3.1 ──┐
      ├──→ 0.3                     │
      ├──→ 2.1                     │
      └──→ 2.2 ──→ 2.3            │
                                   │
1.1 ──┬──→ 1.2 ──→ 2.4            │
      └──→ 1.3                     │
                                   ↓
                        4.1（所有 Phase 0-3 完成后）
                                   ↓
                        4.2 人类联调

1.1 + 1.2 + 1.3 + 3.1 ──→ 5.1 ──→ 5.2
```

---

## 完成标准（Definition of Done）

| 系统 | 完成标准 |
|------|---------|
| BalanceConfig | `CEFRLevel` 类型可被全项目 import，无 TypeScript 报错 |
| PlayerState 扩展 | 全局 level 字段已删除，languageProgress 有正确初始值 |
| Dexie v6 | 两张新表可读写，升级不破坏已有数据 |
| LevelDistributionSampler | 采样结果符合配置概率分布 |
| XPRegistry | SENSE_COLLECTED 来源 XP 计算正确，事件含 language 字段 |
| PlayerLevelSystem | per-language 升级和连续升级均正确 |
| DurabilitySystem | 成功扣耐久 / 恢复 / 归零三种场景正确；失败不扣 |
| useSynthesis 集成 | 三分支（新词/重复持有/再获得）和失败分支均正确 |
| ExportImportService | 导出→清库→导入后，各语言等级和耐久度完整恢复 |
