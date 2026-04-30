import type { Container } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { PixiPersonaData } from '../bridges/PersonaBridge';
import type { gsap } from 'gsap';

/**
 * IBackground 接口定义了背景图层的通用生命周期。
 * 所有具体的 Persona 背景（如 DefaultBackground, CyberpunkBackground）都必须实现此接口。
 */
export interface IBackground {
  /** 背景标识，用于调试和层级管理 */
  readonly label: string;
  /**
   * 初始化背景。加载资源、创建 Mesh/Shader。
   * @param container 背景容器（通常是全屏屏幕空间容器或世界空间容器）
   * @param viewport Viewport 实例，用于监听缩放和位移
   * @param persona 初始 Persona 数据
   */
  init(container: Container, viewport: Viewport, persona: PixiPersonaData): Promise<void>;

  /**
   * 入场动效。
   * @param tl GSAP Timeline 实例，背景应将自己的入场动画加入其中。
   */
  enter(tl: gsap.core.Timeline): void;

  /**
   * 出场动效。
   * @param tl GSAP Timeline 实例，背景应将自己的出场动画加入其中。
   */
  exit(tl: gsap.core.Timeline): void;

  /**
   * 画布尺寸变化时的布局调整。
   * @param w 新的宽度
   * @param h 新的高度
   */
  resize(w: number, h: number): void;

  /**
   * 逐帧更新逻辑（可选）。
   * @param delta 帧间隔
   */
  update?(delta: number): void;

  /**
   * 彻底销毁背景，释放 GPU 资源（Shader, Texture, Mesh）。
   */
  destroy(): void;
}
