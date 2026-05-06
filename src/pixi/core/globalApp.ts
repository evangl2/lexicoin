import { Application } from 'pixi.js';

let _app: Application | null = null;

export function setPixiApp(app: Application | null) {
  _app = app;
}

export function getPixiApp(): Application | null {
  return _app;
}
