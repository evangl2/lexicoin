import { useEffect, useRef } from 'react';
import { useGameStore } from '@store/index';
import type { SynthesisRequest } from '@app-types/api';

/**
 * 处理玩家在合成中途关闭游戏的边缘情况。
 * 组件挂载时，若设备处于 isProcessing 状态，重新发起 synthesize()。
 * Edge function 内部会命中 synthesis_cache 并立即返回结果，无需额外查询逻辑。
 */
export function useResumeProcessing(
  isProcessing: boolean,
  slot1_uid: string | null,
  slot2_uid: string | null,
  synthesize: (params: Omit<SynthesisRequest, 'userId'>) => Promise<void>,
  systemlang: string,
  learninglang: string,
) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!isProcessing || !slot1_uid || !slot2_uid) return;
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const activeModelId = useGameStore.getState().activeModelId;
    synthesize({
      input_1_id: slot1_uid,
      input_2_id: slot2_uid,
      systemlang,
      learninglang,
      modelId: activeModelId,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
