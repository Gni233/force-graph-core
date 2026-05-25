import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export interface PixiLayers {
  app: Application;
  viewport: Viewport;
  gridLayer: Container;
  groupLayer: Container;
  edgeLayer: Container;
  blobLayer: Container;
  nodeLayer: Container;
  labelLayer: Container;
}

export async function createPixiApp(container: HTMLElement): Promise<PixiLayers> {
  const app = new Application();

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  await app.init({
    preference: 'webgl',
    resizeTo: container,
    resolution: dpr,
    autoDensity: true,
    antialias: true,
    backgroundAlpha: 0,
    hello: false,
  });

  container.appendChild(app.canvas);

  // pixi-viewport: zoom/pan/drag/wheel
  // 用 window 尺寸，因为同步 JS 阶段 container.clientWidth 可能是 0（未布局）
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const viewport = new Viewport({
    screenWidth: sw,
    screenHeight: sh,
    worldWidth: 3000,
    worldHeight: 2000,
    events: app.renderer.events,
  });

  viewport
    .drag({ clampWheel: false })
    .wheel()
    .pinch()
    .decelerate()
    .clampZoom({ minScale: 0.1, maxScale: 4 });

  app.stage.addChild(viewport);

  // 原点(0,0)居屏幕正中央
  viewport.position.set(sw / 2, sh / 2);

  // 图层（从后到前）
  const gridLayer = new Container({ label: 'grid' });
  const groupLayer = new Container({ label: 'groups', isRenderGroup: true });
  const edgeLayer = new Container({ label: 'edges', isRenderGroup: true });
  const blobLayer = new Container({ label: 'blobs', isRenderGroup: true });
  const nodeLayer = new Container({ label: 'nodes', isRenderGroup: true });
  const labelLayer = new Container({ label: 'labels' });

  viewport.addChild(gridLayer);
  viewport.addChild(groupLayer);
  viewport.addChild(edgeLayer);
  viewport.addChild(blobLayer);
  viewport.addChild(nodeLayer);
  viewport.addChild(labelLayer);

  return { app, viewport, gridLayer, groupLayer, edgeLayer, blobLayer, nodeLayer, labelLayer };
}
