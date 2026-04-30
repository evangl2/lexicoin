import { useEffect } from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';
import { useGameStore } from '@store/index';
import { personaBridge } from '@/pixi/bridges/PersonaBridge';
import { hexToNumber } from '@/pixi/utils/colors';

/**
 * PixiPersonaBridge 是一个零渲染的 React 组件。
 * 它负责监听 React 侧的 Persona 状态，并将清洗后的数据同步到 PixiJS 侧。
 */
export const PixiPersonaBridge = () => {
  const canvas = useCanvasPersona();
  const theme = useGameStore(s => s.uiTheme);

  useEffect(() => {
    if (!canvas) return;

    // 清洗并同步数据
    personaBridge.setData({
      theme,
      bgVoid: hexToNumber(canvas.palette.colors.bgVoid, 0x0a0a0f),
      primary: hexToNumber(canvas.palette.colors.primary, 0xd4af37),
      secondary: hexToNumber(canvas.palette.colors.primaryDark, 0x5d4c26),
      accent: hexToNumber(canvas.palette.colors.accent, 0xffffff),
      scriptTexture: canvas.assets?.textures?.script,
    });
    
    // 调试日志：确认桥接工作正常
    console.log(`[PixiPersonaBridge] Syncing Persona: ${theme}`, {
        bgVoid: canvas.palette.colors.bgVoid,
        primary: canvas.palette.colors.primary
    });
    
  }, [canvas, theme]);

  return null;
};
