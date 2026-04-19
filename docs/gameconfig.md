# Game Config — 配置文件说明

`src/config/` 下的所有文件是游戏数值和运行参数的唯一权威来源。业务代码只 import，禁止在模块内部硬编码。

```
src/config/
├── canvas.ts         ← 世界尺寸与视口常量
├── balance.ts        ← 游戏数值：XP、等级、CEFR 分布、耐久度
├── grimoireConfig.ts ← 魔典系统：生命周期、体力、评分、奖励、类型注册
└── constants.ts      ← 运行常量：并发限制、AI 模型列表
```

---

## `canvas.ts` — 世界尺寸

| 导出 | 默认值 | 说明 |
|------|--------|------|
| `WORLD_W` | `9600` | 世界总宽度（像素，世界坐标中心为 0,0） |
| `WORLD_H` | `6000` | 世界总高度（像素） |

**消费方**：`Canvas.tsx`、`useGridSnap.ts`、`DragLayer.tsx`、`Canvas.persona.default.tsx`。

历史注意：整合前 `Canvas.tsx` 使用 9600×6000，`useGridSnap.ts` 使用 16000×10000（已于 2026-04-19 统一）。

---

## `balance.ts` — 游戏数值

### CEFR
| 导出 | 说明 |
|------|------|
| `CEFR_LEVELS` | `['A1','A2','B1','B2','C1','C2']` 常量数组 |
| `CEFR_XP_COEFFICIENT` | 各难度的 XP 系数（A1=1.0 … C2=5.0） |

### 等级
| 导出 | 说明 |
|------|------|
| `MAX_LANGUAGE_LEVEL` | `100`，每门语言等级上限 |
| `LEVEL_XP_THRESHOLDS` | 100 条升级 XP 阈值，index = level - 1 |
| `LEVEL_CEFR_DISTRIBUTION` | 按语言等级（1-100）的 CEFR 权重分布；缺失等级 fallback 到 `{A1:1.0}` |

### XP & 耐久
| 导出 | 默认值 | 说明 |
|------|--------|------|
| `XP_SENSE_BASE` | `10` | Sense 基础 XP（待 balance 调整） |
| `DURABILITY_INITIAL` | `100` | 卡片初始耐久度 |
| `DURABILITY_SYNTHESIS_COST` | `10` | 每次合成扣除（待调整） |
| `DURABILITY_DUPLICATE_RESTORE` | `30` | 重复合成恢复（待调整） |

---

## `grimoireConfig.ts` — 魔典系统

### 生命周期
| 导出 | 默认值 | 说明 |
|------|--------|------|
| `GRIMOIRE_DURATION_MS` | `3_600_000`（1小时） | 召唤后魔典的存活时长 |
| `GRIMOIRE_SLOT_COUNT` | `{MIN:3, MAX:6, DEFAULT:4}` | 槽位数量范围；后端选择，前端 clamp |

### 体力（Stamina）
| 导出 | 值 | 说明 |
|------|-----|------|
| `STAMINA_CONFIG.MAX` | `300` | 体力上限 |
| `STAMINA_CONFIG.RECOVERY_PER_HOUR` | `12.5` | 自然恢复速率 |
| `STAMINA_CONFIG.COSTS.GENERATE_GRIMOIRE` | `60` | 召唤魔典消耗 |
| `STAMINA_CONFIG.COSTS.SYNTHESIZE_SENSE` | `5` | 合成 Sense 消耗 |
| `STAMINA_CONFIG.ECHO_MAX_CHARGES` | `3` | Echo 最大充能数 |

### 评分（Scoring）
| 导出 | 说明 |
|------|------|
| `GRADE_VALUES` | Grade → 数字映射（S++=8 … F=0），用于计算加权平均 |
| `F_PENALTY_MULTIPLIER` | `0.3`，每个 F 对最终分的扣减系数 |
| `FINAL_GRADE_THRESHOLDS` | 最终分 → 最终 Grade 的阈值列表（从高到低） |
| `GRIMOIRE_REWARDS` | 每个 Grade 对应的 XP、Resonance、mastery increments 奖励 |

### 类型注册
`GRIMOIRE_TYPES_REGISTRY`：8 种魔典语义类型（`taxonomy`、`anatomy`、`locus`、`time`、`spectrum`、`qualia`、`ritual`、`metaphor`），每种包含 `label`、`description`、`targetLogic`（注入生成 prompt 的内部提示）。

---

## `constants.ts` — 运行常量

| 导出 | 值 | 说明 |
|------|----|------|
| `MAX_CONCURRENT_SYNTHESES` | `3` | 全局并发合成管线上限 |
| `AI_MODELS` | 见文件 | 可用 AI 模型列表（含 OpenRouter 备用） |
| `DEFAULT_MODEL_ID` | `'gemini-3.1-flash-lite-preview'` | 默认模型 |
