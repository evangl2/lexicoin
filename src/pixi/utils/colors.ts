/**
 * 将 CSS Hex 字符串 (如 "#ff0000" 或 "0xff0000") 转换为 PixiJS 使用的数字格式 (0xff0000)。
 */
export function hexToNumber(hex: string, fallback = 0x000000): number {
  if (!hex || typeof hex !== 'string') return fallback;
  const cleanHex = hex.replace('#', '').replace('0x', '');
  const num = parseInt(cleanHex, 16);
  return isNaN(num) ? fallback : num;
}
