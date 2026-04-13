import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  input,
  effect,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlueprintElement, RoomSpec } from '../../core/models/room.model';
import { CatalogItem } from '../../core/models/catalog.model';
import { buildRoomScene, BuildResult } from './room-3d-builder';

@Component({
  selector: 'app-room-3d-viewer',
  standalone: true,
  template: `
    <div class="viewer">
      <div class="canvas-host" #host></div>

      @if (!hasElements()) {
        <div class="empty-hint">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M21 16V8L12 3L3 8V16L12 21L21 16Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M3 8L12 13L21 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M12 13V21" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <p>Your room shell is visible.<br>Add walls & furniture in the Blueprint tab to populate the 3D view.</p>
        </div>
      }

      <div class="hud">
        <span class="dims">{{ dimsLabel() }}</span>
        <button class="hud-btn" (click)="resetCamera()" title="Reset camera">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M1 4V10H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 15C4.15 16.82 5.45 18.33 7.14 19.26C8.83 20.19 10.81 20.47 12.7 20.04C14.6 19.61 16.29 18.5 17.43 16.91" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Reset
        </button>
        <button class="hud-btn" (click)="cycleView()" title="Cycle preset view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/>
            <path d="M12 3C14.5 6 14.5 18 12 21" stroke="currentColor" stroke-width="1.5"/>
            <path d="M3 12H21" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          {{ viewName() }}
        </button>
      </div>

      <div class="legend">
        <span>Drag: rotate · Right-drag: pan · Scroll: zoom</span>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; width: 100%; }
    .viewer {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #eef2f7 0%, #dde4ed 100%);
      overflow: hidden;
    }
    .canvas-host {
      position: absolute;
      inset: 0;
    }
    .canvas-host :global(canvas) {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
    .empty-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      text-align: center;
      color: #5f6368;
      svg { color: #9aa0a6; margin-bottom: 10px; }
      p { margin: 0; font-size: 12px; line-height: 1.5; }
    }
    .hud {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      gap: 8px;
      align-items: center;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      padding: 6px 8px 6px 12px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .dims {
      font-size: 11px;
      font-weight: 600;
      color: #5f6368;
      white-space: nowrap;
    }
    .hud-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f1f3f4;
      border: none;
      border-radius: 7px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #3c4043;
      cursor: pointer;
      transition: background .12s;
      svg { color: #5f6368; }
    }
    .hud-btn:hover { background: #e8eaed; }
    .legend {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 14px;
      background: rgba(32, 33, 36, 0.75);
      color: #fff;
      font-size: 11px;
      border-radius: 16px;
      backdrop-filter: blur(4px);
      pointer-events: none;
    }
  `,
})
export class Room3dViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  room = input.required<RoomSpec>();
  catalogItems = input<CatalogItem[]>([]);

  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private buildResult?: BuildResult;
  private rafId = 0;
  private resizeObserver?: ResizeObserver;
  private viewIndex = 0;

  dimsLabel = signal('');
  viewName = signal('Isometric');
  hasElements = signal(false);

  constructor() {
    effect(() => {
      const room = this.room();
      if (!room || !this.renderer) return;
      this.rebuildScene();
    });
  }

  ngAfterViewInit() {
    this.initRenderer();
    this.rebuildScene();
    this.startLoop();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.hostRef.nativeElement);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.disposeBuild();
    if (this.renderer) {
      this.renderer.dispose();
      const dom = this.renderer.domElement;
      dom.parentNode?.removeChild(dom);
    }
  }

  private initRenderer() {
    const host = this.hostRef.nativeElement;
    const width = host.clientWidth || 800;
    const height = host.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xeef2f7, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 500);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x9ca3af, 0.9);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(4, 8, 5);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-5, 3, -4);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI * 0.49; // don't drop below the floor
  }

  private rebuildScene() {
    if (!this.renderer) return;
    const room = this.room();
    if (!room) return;

    this.disposeBuild();

    const furnitureImages = new Map<string, string>();
    for (const item of this.catalogItems() ?? []) {
      if (item.image_base64) {
        furnitureImages.set(item.id, item.image_base64);
      }
    }

    const elements: BlueprintElement[] = room.blueprint_elements ?? [];
    this.hasElements.set(elements.length > 0);

    const result = buildRoomScene({
      elements,
      dimensions: room.dimensions,
      furnitureImages,
    });
    this.buildResult = result;
    this.scene.add(result.group);

    this.dimsLabel.set(
      `${room.dimensions.width}' × ${room.dimensions.length}' × ${room.dimensions.height}'`
    );

    this.frameCamera('isometric');
  }

  private disposeBuild() {
    if (!this.buildResult) return;
    this.scene.remove(this.buildResult.group);
    for (const d of this.buildResult.disposables) d.dispose();
    this.buildResult = undefined;
  }

  private startLoop() {
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.controls?.update();
      if (this.renderer) this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  private onResize() {
    if (!this.renderer) return;
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  resetCamera() {
    this.viewIndex = 0;
    this.frameCamera('isometric');
  }

  cycleView() {
    const presets: Array<'isometric' | 'front' | 'side' | 'top'> = ['isometric', 'front', 'side', 'top'];
    this.viewIndex = (this.viewIndex + 1) % presets.length;
    this.frameCamera(presets[this.viewIndex]);
  }

  private frameCamera(preset: 'isometric' | 'front' | 'side' | 'top') {
    if (!this.buildResult || !this.controls) return;
    const { roomSizeM } = this.buildResult;
    const diag = Math.hypot(roomSizeM.width, roomSizeM.length);
    const d = diag * 1.1;

    let pos: THREE.Vector3;
    switch (preset) {
      case 'front':
        this.viewName.set('Front');
        pos = new THREE.Vector3(0, roomSizeM.height * 0.55, d);
        break;
      case 'side':
        this.viewName.set('Side');
        pos = new THREE.Vector3(d, roomSizeM.height * 0.55, 0);
        break;
      case 'top':
        this.viewName.set('Top');
        pos = new THREE.Vector3(0, d * 1.1, 0.001);
        break;
      default:
        this.viewName.set('Isometric');
        pos = new THREE.Vector3(d * 0.7, d * 0.65, d * 0.7);
    }
    this.camera.position.copy(pos);
    this.controls.target.set(0, roomSizeM.height * 0.35, 0);
    this.controls.update();
  }
}
