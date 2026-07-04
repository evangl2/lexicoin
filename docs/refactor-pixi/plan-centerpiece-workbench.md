# 实施计划:Centerpiece 光照系统重做 + 调参面板"工作台"化(第一包)

> 状态: 现行(一次性实施计划,完成验收后标记归档) · 类型: 流程 · 更新: 2026-07-04
> 📖 人话: 本文是给实施 AI 会话的完整任务书。用户与规划会话已完成全部方案讨论,实施者照此执行,不需要重新决策。

## 0. 实施者必读边界(违反即返工)

1. **先读** `CLAUDE.md`(五条铁律)与 [ADR-004](../decisions/ADR-004-shader-budget-and-tuning-workflow.md)、[ADR-006](../decisions/ADR-006-material-model-family.md)
2. **铁律一红线**:你只写管线、滑块、preset 字段;**一切新参数的默认值必须使画面与实施前逐像素一致**(仅"边缘抗锯齿"与"去色带"两项例外,它们是消除瑕疵方向的画质修复,已获用户批准)
3. **只改 v4**:所有 shader 改动仅在 `FRAG_WGSL_V4`;`FRAG_WGSL`(v3)是对比基线,一个字符都不许动
4. 不做本文之外的重构;不动 `DefaultBackground`/相机/AABB;面板对外接口(`syncUI`/`onPersonaChanged`/`destroy`/`toggle`)保持不变
5. 开工前提醒用户:**先 commit 当前工作区作为回滚锚点**
6. 完成后跑 `npx tsc --noEmit`(过滤 `src/pixi` 无错即可,其他目录有历史遗留错误);**不自行 commit**,交用户验收
7. 收尾按 [session-protocol.md](../workflow/session-protocol.md):更新 ADR-006 后果节、INDEX 中本文状态

涉及文件:`src/pixi/backgrounds/CenterpieceDecal.ts`、`CenterpieceDebugPanel.ts`、`centerpiece-presets.ts`,新建 `src/assets/matcaps/`(放 `.gitkeep`)。

---

## 1. 光照系统重做(shader + TS)

### 1.1 两个模式下拉(新 preset 字段)

- `lightType`: `0=平行光`(现状) `1=点光`
- `lightDrive`: `0=固定` `1=自动公转` `2=跟随鼠标` `3=公转+鼠标混合`(现状,默认)

TS 侧 `update()` 的光计算按 drive 分支:固定→读角度/位置参数;公转→现有 orbit;鼠标→全跟随;混合→现有 mix 逻辑。

### 1.2 参数总表(全部进 `_params` + preset 接口 + 两个映射函数 + 面板)

| 参数 | 默认(=现状) | 说明 |
|---|---|---|
| `lightType` / `lightDrive` | 0 / 3 | 见上 |
| `fixedLightAngle` | 0 | 固定+平行光:方位角(度),TS 换算 lx/ly |
| `fixedLightX/Y` | 0 / 0 | 固定+点光:位置(-1~1,相对法阵中心) |
| `mouseRange` | 1000 | 替换 update() 里硬编码的 `/1000` |
| `lightSmoothing` | 0 | 光追鼠标的阻尼。0=瞬移(现状);实现:`lx += (target-lx) * (1-exp(-dt*k))`,k 由参数映射 |
| `pointFalloffRadius` | 0.6 | 点光衰减半径(UV 尺度) |
| `pointFalloffCurve` | 2.0 | 衰减指数:大=追光硬边,小=油灯柔晕 |
| `lightFlickerAmp` | 0 | 摇曳幅度。TS 侧平滑噪声(2~3 个不同频正弦叠加)调制光强,**写 uniform 时乘,不改 _params** |
| `lightFlickerSpeed` | 1.0 | 摇曳速度 |
| `fillLightStrength` | 0 | 副光强度(0=关,现状) |
| `fillLightColorR/G/B` | 0.6/0.7/0.9 | 副光颜色 |
| `fillLightAngle` | 180 | 副光方位角 |
| `fillLightAutoOppose` | 1 | 开=副光自动待在主光对面(忽略 fillLightAngle) |
| `reliefShadowStrength` | 0 | 浮雕投影强度(0=关) |
| `reliefShadowLength` | 0.02 | 投影长度(UV) |
| `reliefShadowSoftness` | 0.5 | 投影柔度 |
| `hoverGlowRadius` | 0 | 鼠标接近发光:0=关;半径为世界单位 |
| `hoverGlowStrength` | 1.0 | 接近时发光增益上限 |
| `maskAnimDepth` | 1.0 | 动画幅度:`animMult = 1 + (animMult-1)*depth` |
| `parallaxFollow` | 0 | `0=跟随光`(现状) `1=跟随鼠标`(鼠标相对中心偏移代替 L.xy 驱动 pOffset) |
| `envUniformity` | 0 | 反射均匀度:`envGate = mix(envFresnel, vec3(1.0), uniformity)`,修非金属环境反射被 fresnel 卡死至 4% 的问题 |

### 1.3 shader 侧(仅 FRAG_WGSL_V4)

- **点光**:传 `uLightPos(uv 空间) + lightType flag`;点光时逐像素 `L = normalize(vec3(lightPos.xy - uv 换算, lightHeight))`,衰减 `atten = pow(clamp(1 - dist/radius, 0, 1), curve)` 乘进 `lightLin`。平行光路径保持现状
- **副光**:仅参与漫反射(职责=托暗部):`fill_term = diffuseColor * diffuse_factor * s2l(fillColor) * fillStrength * max(dot(N, fillDir), 0)`,方向由 TS 算好传入(AutoOppose 时 = 主光方向取反,高度同主光)。风格化分支同样加(乘 ramp 不必,直接加软贡献即可)
- **浮雕投影**:沿光方向在高度图上 4 次固定步长采样,若采样点高度高于当前点则累积遮挡;`shadow = 1 - strength * occlusion`,乘进主光的 diffuse 与 spec(不乘 ambient/env)。`softness` 控制遮挡累积的平滑。默认 strength 0 = 完全旁路
- **视差跟随鼠标**:`parallaxFollow=1` 时 pOffset 的驱动向量换成 uniform 传入的鼠标偏移(TS 算好),其余公式不变
- **边缘抗锯齿**(替换现状):`let w = max(fwidth(rawDiffuse.a) * 1.0, 0.0001); edgeAlpha = smoothstep(clipThreshold - w, clipThreshold + w, rawDiffuse.a);`(v3 保留旧的 ±0.008 不动)
- **去色带**:输出前 `lit += (hash21(uv * cam.uResolution) - 0.5) / 255.0 * uDitherStrength`,hash21 用标准整数散列;`ditherStrength` 默认 1.0,放高级区滑块
- **uniform 扩容**:V4Uniforms 追加 `uV4E/uV4F/uV4G/uV4H`(vec4 各槽位自行分配并在 struct 注释里写明),同步 UniformGroup 与 `_flushParams`。注意 WGSL struct 与 UniformGroup 字段名严格一致

### 1.4 TS 侧注意

- flicker 与 hoverGlow 是**运行时调制**:在写 uniform 的最后一步相乘,绝不能写回 `_params`(会污染草稿与改动高亮)
- hoverGlow:鼠标到法阵中心的世界距离 → `boost = 1 + strength * smoothstep(radius, 0, dist)`,乘 finalIntensityR/G/B
- 平滑需要 dt:`update(delta)` 的 delta 是 ticker.deltaTime(60fps 归一),换算 `dt = delta / 60`

## 2. 旧参数修复

1. **菲涅尔幂**:滑块量程改为 `min 0.05, max 3, step 0.05`(uniform 与默认值 5.0 不变——注意默认值在新量程外,面板数值框仍显示 5.00,用户拖动后进入有效区;tip 写明"越低越明显,俯视视角下高值≈无效")
2. **缝隙阴影重定义**:v4 中 `cavity` 除现有 specMask 外,也乘进 diffuse_term(`diffuse_term *= mix(1.0, cavity, 1.0)` 直接乘 cavity 即可,因 cavity 本身由 cavityStrength 插值,默认 0 时 cavity=1 无变化)。tip 更新为"深缝阴影:同时压暗底色与高光"
3. 视差、环境反射的修复已含在 1.2/1.3 中

## 3. Matcap 文件夹自动上架

- 新建 `src/assets/matcaps/`(含 `.gitkeep`)
- `import.meta.glob('/src/assets/matcaps/*.{png,jpg,webp}', { eager: true, query: '?url', import: 'default' })` 生成 `{ name, url }[]`
- 面板"光照"页签内放**圆形缩略图网格**:第一项"默认"(程序生成 matcap),其后每个文件一个圆;点击 → `loadEnvTexture(url)` 并写 `_params.envTex`;当前选中高亮
- preset 的 `envTex` 逻辑已存在,不改

## 4. 面板"工作台"化

### 4.1 页签骨架

顶部页签栏:**材质 | 光照 | 图层 | 演出**。图层/演出本包只放占位页(一句"第二包实施")。搜索、撤销、A/B 对比、改动高亮为全局设施,任意页签可用。现有分区按归属拆进材质/光照两页签(交互与动态、光照与表面中的光参数 → 光照页;其余 → 材质页)。

### 4.2 控件升级

- **下拉框化**(替换 0/1/2 滑块,选项全中文):渲染管线(v3 旧版/v4 新版)、材质模型(PBR 物理/风格化手绘)、色调映射(无/Reinhard/ACES)、光源类型、驱动方式、视差跟随(跟随光/跟随鼠标)
- **开关化**(勾选框):法线翻转 X/Y、高度反转、边缘修正、副光自动对位
- 面板 schema 扩展:`SliderDef` 之外增加 `SelectDef { key, label, options: {value,label}[], tip }` 与 `ToggleDef`,构建函数各一个,`syncUI`/改动高亮/搜索一并支持
- **条件显示**:`lightDrive` 决定 固定角度/公转/鼠标/混合 参数组的可见性;`lightType=平行光` 时隐藏点光衰减组;实现为一个 `visibilityRules: Record<paramKey, (params)=>boolean>`,在 syncUI 时统一应用

### 4.3 防呆设施

- **常用区**:两页签之上各设"常用"折叠区(材质页:曝光/饱和度/凹凸X/高光强度/发光总强度;光照页:主光强度/环境光强度/环境反射/鼠标灵敏度),实现为引用同一参数的第二个滑块行(共享 `_sliderRefs` 需支持一 key 多行——改为 `Map<string, Ref[]>`)
- **撤销**:每次面板触发的参数提交(滑块 change、下拉、开关、preset 应用)前推入快照环形栈(50 步);`Ctrl+Z` 恢复并 syncUI。A/B 对比的按住/松开不入栈
- **分区级恢复**:每个分区头右侧小 ↺,把该区所有 key 重置为基线值
- **全量重置确认**:现有 ↺ 按钮点击后需二次确认(面板内嵌一行"确定丢弃全部修改? [确定] [取消]",不用 window.confirm)
- 保留现有全部设施:搜索、双击恢复单参数、金色改动标记、⇆ 按住看原版、折叠记忆、复制/下载 JSON、风格化无效参数变暗(`DEAD_IN_STYLIZED` 需复核:副光在风格化分支有效,不加入)

## 5. Preset 兼容

所有新字段在 `CenterpiecePreset` 为可选,`presetToParams` 给默认值(见 1.2 表),`paramsToPreset` 全量写出。旧 JSON 与 localStorage 草稿无损加载。

## 6. 验收标准(实施者自检)

1. `npx tsc --noEmit` 中 `src/pixi` 无错误
2. 默认参数下(除边缘 AA/去色带),v4 画面与实施前一致;v3 完全不变
3. 每个新参数拖动有实时反馈;条件显示随下拉切换正确增减
4. 撤销/分区恢复/重置确认/常用区/下拉/开关全部可用;搜索能命中新参数
5. matcaps 文件夹放入一张 PNG 后刷新,缩略图出现且可应用
6. 交付时向用户输出**中文验收清单**(逐项操作步骤,含:点光+跟随鼠标的"火把"体验、副光托暗部、浮雕投影随光转、摇曳、接近发光、视差跟随鼠标、边缘放大无锯齿、暗部无色带)

## 7. 第二包预告(本包不做,占位页即可)

图层页签(符文环层/尘埃粒子层/眼睛开关/层参数进 preset)、演出页签(快照步骤单:捕捉当前画面为状态 → 步骤列表[状态/过渡时长/缓动五选/停留/一次性特效] → GSAP 时间轴试放 → 演出 JSON 导出)、回收演出四段反应库(苏醒/吸入/爆闪/回落,特效用 pixi-filters ShockwaveFilter + 手写粒子)。设计详情见规划会话记录,实施前另出计划。
