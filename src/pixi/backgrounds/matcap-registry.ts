/**
 * Matcap 环境贴图自动上架:把任何 PNG/JPG/WebP 放进 src/assets/matcaps/,
 * 面板的圆形缩略图网格会在下次刷新时自动出现,无需改代码或维护清单文件。
 * 用法见 docs/refactor-pixi/plan-centerpiece-workbench.md §3。
 */

export interface MatcapEntry {
  name: string;
  url: string;
}

const files = import.meta.glob('/src/assets/matcaps/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const MATCAP_LIBRARY: MatcapEntry[] = Object.entries(files)
  .map(([path, url]) => ({
    name: (path.split('/').pop() ?? path).replace(/\.(png|jpe?g|webp)$/i, ''),
    url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
