# ADR-012: 前后端通信契约规范

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-06
> 📖 人话: 前后端怎么说话的规矩:所有 AI 调用带 request_id 防重、超时预算和延迟蓝图对账(60s 上限提到 120s)、契约文件单一真相源 + CI 哈希比对、错误信封统一。现有同步 invoke 架构不重构。

## 背景

2026-07-06 实勘 + 作者定案。现状:真实通信仅 3 个 `supabase.functions.invoke` 调用点(synthesize-sense / generate-grimoire / evaluate-grimoire)+ visual 轮询(Realtime 已禁用,`RealtimeService` 为空壳存根)。已有良好雏形:`synthesis_requests` 幂等表(request_id 防重、10min 过期、RLS 锁 service_role)。问题:幂等只覆盖合成;超时链 60s 与延迟蓝图的 90s 尾部预算(ATLAS §2.3)冲突;前后端契约无共享机制,shape 漂移靠人肉;APIClient 是从未建成后端的幽灵客户端。

## 决策

1. **架构不重构**:维持同步 invoke + visual 轮询的现状。异步作业化(插作业行→处理→取结果)仅在未来某调用系统性超出 Edge Function 墙钟时再议;
2. **幂等全覆盖**:所有 AI 调用(现有与新增)必须携带客户端生成的 `request_id`;近期小活:给 generate-grimoire / evaluate-grimoire 补上(评判重复投递会烧双倍 token 且可能判出两个不同结果);
3. **超时与预算对账**:每个调用点显式声明超时预算,与延迟蓝图(平均 10s / 5% 至 90s)一致——callAI 超时上限 60s → **120s**,消除"预算允许 90s、超时 60s 掐死"的自相矛盾;
4. **契约单一真相源 + 机械校验**:请求/响应类型与常量集中到 `supabase/functions/_shared/contracts.ts`,`src/` 侧持镜像副本;**CI 增加哈希比对步骤**,两份不一致即红灯。同一机制覆盖 `functions/lib ↔ core/services`、`callAI` 双副本——"双份真相"从纪律问题降级为机械校验问题;
5. **错误信封统一**:`{ success, data, error }` 事实惯例写入契约文件,并区分**可重试/不可重试**错误(前端退费逻辑依赖此区分:体力已扣 + AI 失败 → 退费;网络重复 → 幂等表挡);
6. **部署漂移核查**:Edge Functions 为手动 CLI 部署,动后端前先 `supabase functions list` / `db diff` 核对云端与仓库一致性(ATLAS 缺口表项)。

## 理由

- 三个调用点都能跑,重构通信层的收益排不过 Stage F(游戏可玩性);规则比架构便宜;
- 哈希比对是 CI 上线后的低垂果实,半天工作量,永久性解除本项目最反复发作的"双份真相"病;
- "等待即演出"(ADR-011 原则 3)已为通信延迟提供视觉容器,通信层无需为体验做任何额外伪装。

## 后果

待实施清单(依次,均为小活):① callAI 超时 60→120s(注意双副本同步);② grimoire 两调用补 request_id(幂等表复用或新建 grimoire_requests);③ `_shared/contracts.ts` 建立 + src 镜像 + CI 哈希比对步骤;④ 错误信封写入契约。APIClient/types/api.ts 幽灵随 Stage O 清除(已记 strategic-command §1.3)。
