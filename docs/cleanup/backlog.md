# Cleanup Backlog
## Pending decision

### TODO in supabase/functions/_shared/personas/CHILD.ts:99
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
         * trigger id 是前端的识别键。当前后端只负责返回 triggeredCondition。
         *
         * TODO：结局达成后，考虑在对应 stages 中 override description / voiceDescription，
         * 让玩家感受到 persona 的变化。
         */
```

### TODO in src/modules/level/LevelModule.ts:88
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
        messageBus.subscribe<any>('MODULE_INITIALIZED', async (message) => {
            if (message.payload.moduleId === 'Auth') {
                // TODO: 触发每日连签检查
            }
        });
```

### TODO in supabase/functions/_shared/personas/GARDENER.ts:12
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
    base: {
        voiceDescription: {
            // TODO: add zh entry when GARDENER voice content is finalized
            en:
                'Speaks slowly and precisely, as if choosing words the way one chooses seeds. ' +
```

### TODO in supabase/functions/_shared/personas/GARDENER.ts:26
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
            'One measured sentence per slot.',
        evalBias: -0.1,
        // TODO: design GARDENER story triggers when persona story development begins
        triggers: [],
        excludedTypes: ['metaphor', 'spectrum'],
```

### TODO in supabase/functions/_shared/personas/ALCHEMIST.ts:12
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
    base: {
        voiceDescription: {
            // TODO: add zh entry when ALCHEMIST voice content is finalized
            en:
                'Cold, exact, occasionally dry. Uses technical vocabulary without apology. ' +
```

### TODO in supabase/functions/_shared/personas/ALCHEMIST.ts:26
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
            'One sentence per slot. Technical register. No rhetorical questions.',
        evalBias: -0.3,
        // TODO: design ALCHEMIST story triggers when persona story development begins
        triggers: [],
        excludedTypes: ['locus', 'qualia'],
```

### TODO in src/core/store/slices/createGrimoireSlice.ts:99
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
        // Max 99 books in library
        if (state.libraryGrimoires.length >= 99) {
            // TODO: Add notification via get().addNotification
            return state;
        }
```

### TODO in src/core/assets/AssetManager.ts:82
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
        try {
            // Simulate asset loading based on type
            // TODO: Implement actual loading logic
            switch (asset.type) {
                case 'IMAGE':
```

### TODO in src/core/assets/AssetManager.ts:146
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
     */
    private async loadFont(url: string): Promise<void> {
        // TODO: Implement font loading
        logger.warn('Font loading not yet implemented', { url }, 'AssetManager');
    }
```

### TODO in src/app/components/ui/shell/ProgressionHUD.tsx:50
- **Category**: Unclear (needs user review)
- **Context**:
```typescript
                {/* CEFR 标签 */}
                <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 bg-indigo-500 rounded text-[9px] font-bold text-white shadow-lg">
                    A1 {/* TODO: 从配置中获取动态 CEFR */}
                </div>
            </motion.div>
```

## User-rejected
## Resolved
