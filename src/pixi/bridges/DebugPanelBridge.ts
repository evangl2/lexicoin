/**
 * DebugPanelBridge 让 React 侧的 DevConsole 能发现并开合 CenterpieceDebugPanel,
 * 而不需要拥有它的生命周期(面板仍由 CenterpieceDecal 创建/销毁,自成一个浮窗)。
 * 面板在生产构建下也会被 new 出来但内部早退(见 CenterpieceDebugPanel._el 防护),
 * 这里的 toggle 调用在那种情况下安全地空操作。
 */

interface ToggleablePanel {
  toggle(): void;
}

type Listener = (available: boolean) => void;

class DebugPanelBridge {
  private _panel: ToggleablePanel | null = null;
  private _listeners: Set<Listener> = new Set();

  public register(panel: ToggleablePanel | null): void {
    this._panel = panel;
    this._listeners.forEach(fn => fn(this.isAvailable()));
  }

  public isAvailable(): boolean {
    return this._panel !== null;
  }

  public toggle(): void {
    this._panel?.toggle();
  }

  public onAvailabilityChange(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

export const debugPanelBridge = new DebugPanelBridge();
